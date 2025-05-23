/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GameAgent, LLMModel } from '@virtuals-protocol/game';
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

      const tweets = await this.twitterClient.v2.userTimeline(me.data.id, {
        max_results: 100,
        'tweet.fields': ['created_at', 'text', 'public_metrics'],
      });
      console.log('Raw tweets response:', tweets);

      if (!tweets?.data?.data) {
        throw new Error('No tweets found');
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
      throw error;
    }
  }
}
