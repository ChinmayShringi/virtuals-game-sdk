/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GameAgent,
  LLMModel,
  GameFunction,
  ExecutableGameFunctionResponse,
  ExecutableGameFunctionStatus,
} from '@virtuals-protocol/game';
import { TwitterApi } from '@virtuals-protocol/game-twitter-node';
import TwitterPlugin from '@virtuals-protocol/game-twitter-plugin';

export interface Thread {
  id: string;
  title: string;
}

@Injectable()
export class XService implements OnModuleInit {
  private agent: GameAgent;
  private twitterClient: TwitterApi;

  constructor(private configService: ConfigService) {
    // Initialize Twitter client
    this.twitterClient = new TwitterApi({
      gameTwitterAccessToken: this.configService.get<string>(
        'GAME_TWITTER_ACCESS_TOKEN',
      )!,
    });

    // Create post tweet function
    const postTweetFunction = new GameFunction({
      name: 'post_tweet',
      description: 'Post a tweet',
      args: [
        { name: 'tweet', description: 'The tweet content' },
        {
          name: 'tweet_reasoning',
          description: 'The reasoning behind the tweet',
        },
      ] as const,
      executable: async (args, logger) => {
        try {
          logger(`Posting tweet: ${args.tweet}`);
          logger(`Reasoning: ${args.tweet_reasoning}`);

          const response = await this.twitterClient.v2.tweet(args.tweet);
          console.log('Tweet posted:', response);

          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Done,
            'Tweet posted successfully',
          );
        } catch (e) {
          console.error('Failed to post tweet:', e);
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Failed,
            'Failed to post tweet',
          );
        }
      },
    });

    // Create Twitter plugin
    const twitterPlugin = new TwitterPlugin({
      twitterClient: this.twitterClient,
    });

    // Create your agent with the Twitter plugin worker
    this.agent = new GameAgent(
      this.configService.get<string>('GAME_API_KEY')!,
      {
        name: 'Threads Bot',
        goal: 'List and manage threads',
        description: 'A bot that lists and manages threads',
        llmModel: LLMModel.DeepSeek_R1,
        workers: [twitterPlugin.getWorker()],
      },
    );
  }

  // initialize once
  async onModuleInit() {
    await this.agent.init();
  }

  /**
   * Post a new tweet
   */
  async postTweet(content: string, reasoning: string): Promise<void> {
    try {
      // Post tweet directly using Twitter client
      const response = await this.twitterClient.v2.tweet(content);
      console.log('Tweet posted:', response);
    } catch (error) {
      console.error('Error posting tweet:', error);
      
      // Handle rate limits
      if (error.code === 429) {
        console.log('Rate limit hit, waiting for reset...');
        const resetTime = error.headers['x-ratelimit-reset'];
        throw new Error(
          `Rate limit exceeded. Please try again after ${resetTime}`,
        );
      }

      // Handle other errors
      if (error.code === 400) {
        console.log('Bad request, checking authentication...');
        throw new Error(
          'Authentication error. Please check your Twitter credentials.',
        );
      }

      throw new Error(`Failed to post tweet: ${error.message}`);
    }
  }

  /**
   * List threads with simple JS-based pagination.
   * page & limit come from your controller query params.
   */
  async listThreads(page = 1, limit = 10): Promise<Thread[]> {
    try {
      const response = await this.agent.step();
      console.log('Step response:', response);

      // Get user's timeline instead of search
      const me = await this.twitterClient.v2.me();
      console.log('User info:', me);

      // Use correct v2 parameters
      const tweets = await this.twitterClient.v2.userTimeline(me.data.id, {
        max_results: 100,
        'tweet.fields': ['created_at', 'text', 'public_metrics'],
        expansions: ['author_id'],
        'user.fields': ['username', 'name'],
      });
      console.log('Raw tweets response:', tweets);

      if (!tweets?.data?.data) {
        console.log('No tweets found, returning empty array');
        return [];
      }

      const threads: Thread[] = tweets.data.data.map((tweet) => ({
        id: tweet.id,
        title: tweet.text,
      }));
      console.log('Converted threads:', threads);

      // slice for pagination
      const start = (page - 1) * limit;
      return threads.slice(start, start + limit);
    } catch (error) {
      console.error('Error in listThreads:', error);

      // Handle rate limits
      if (error.code === 429) {
        console.log('Rate limit hit, waiting for reset...');
        const resetTime = error.headers['x-ratelimit-reset'];
        throw new Error(
          `Rate limit exceeded. Please try again after ${resetTime}`,
        );
      }

      // Handle other errors
      if (error.code === 400) {
        console.log('Bad request, checking authentication...');
        throw new Error(
          'Authentication error. Please check your Twitter credentials.',
        );
      }

      throw new Error(`Failed to fetch threads: ${error.message}`);
    }
  }
}
