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

export interface TweetAnalytics {
  id: string;
  text: string;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  created_at: string;
}

export interface TweetMention {
  id: string;
  text: string;
  author_id: string;
  author_username: string;
  author_name: string;
  created_at: string;
}

export interface ThreadPost {
  content: string;
  mentions?: string[];
}

export interface MentionedPost {
  tweet_id: string;
  thread_id: string;
  text: string;
  author_username: string;
  author_name: string;
  created_at: string;
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
      ),
    });

    // Create Twitter plugin
    const twitterPlugin = new TwitterPlugin({
      twitterClient: this.twitterClient,
    });

    // Create your agent with the Twitter plugin worker
    this.agent = new GameAgent(this.configService.get<string>('GAME_API_KEY'), {
      name: 'Threads Bot',
      goal: 'List and manage threads',
      description: 'A bot that lists and manages threads',
      llmModel: LLMModel.DeepSeek_R1,
      workers: [twitterPlugin.getWorker()],
    });
  }

  // initialize once
  async onModuleInit() {
    await this.agent.init();
  }

  /**
   * Post a new tweet with optional mentions
   */
  async postTweet(content: string, mentions?: string[]): Promise<void> {
    try {
      // Format mentions if provided
      const formattedContent = mentions?.length
        ? `${content}\n\n${mentions.map((m) => `@${m}`).join(' ')}`
        : content;

      // Post tweet directly using Twitter client
      const response = await this.twitterClient.v2.tweet(formattedContent);
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
   * Post a thread with mentions
   */
  async postThread(threadPosts: ThreadPost[]): Promise<void> {
    try {
      if (!threadPosts.length) {
        throw new Error('Thread must contain at least one post');
      }

      let previousTweetId: string | undefined;

      // Post each tweet in the thread
      for (const post of threadPosts) {
        const formattedContent = post.mentions?.length
          ? `${post.content}\n\n${post.mentions.map((m) => `@${m}`).join(' ')}`
          : post.content;

        if (previousTweetId) {
          // Reply to the previous tweet
          const response = await this.twitterClient.v2.reply(
            formattedContent,
            previousTweetId,
          );
          console.log('Thread reply posted:', response);
          previousTweetId = response.data.id;
        } else {
          // Post the first tweet
          const response = await this.twitterClient.v2.tweet(formattedContent);
          console.log('Thread starter posted:', response);
          previousTweetId = response.data.id;
        }
      }
    } catch (error) {
      console.error('Error posting thread:', error);
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

      throw new Error(`Failed to post thread: ${error.message}`);
    }
  }

  /**
   * Reply to a tweet
   */
  async replyToTweet(tweetId: string, replyContent: string): Promise<void> {
    try {
      // Reply to tweet using Twitter client
      const response = await this.twitterClient.v2.reply(replyContent, tweetId);
      console.log('Reply posted:', response);
    } catch (error) {
      console.error('Error replying to tweet:', error);
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

      throw new Error(`Failed to reply to tweet: ${error.message}`);
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

  /**
   * Like a tweet
   */
  async likeTweet(tweetId: string): Promise<void> {
    try {
      // Get current user ID first
      const me = await this.twitterClient.v2.me();
      console.log('User info:', me);

      // Like the tweet using both user ID and tweet ID
      const response = await this.twitterClient.v2.like(me.data.id, tweetId);
      console.log('Tweet liked:', response);
    } catch (error) {
      console.error('Error liking tweet:', error);
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

      throw new Error(`Failed to like tweet: ${error.message}`);
    }
  }

  /**
   * Get tweet analytics
   */
  async getTweetAnalytics(tweetId: string): Promise<TweetAnalytics> {
    try {
      const tweet = await this.twitterClient.v2.singleTweet(tweetId, {
        'tweet.fields': ['public_metrics', 'created_at'],
      });
      console.log('Tweet analytics:', tweet);

      if (!tweet?.data) {
        throw new Error('Tweet not found');
      }

      return {
        id: tweet.data.id,
        text: tweet.data.text,
        likes: tweet.data.public_metrics.like_count,
        retweets: tweet.data.public_metrics.retweet_count,
        replies: tweet.data.public_metrics.reply_count,
        views: tweet.data.public_metrics.impression_count,
        created_at: tweet.data.created_at,
      };
    } catch (error) {
      console.error('Error getting tweet analytics:', error);
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

      throw new Error(`Failed to get tweet analytics: ${error.message}`);
    }
  }

  /**
   * Get mentions for the authenticated user
   */
  async getMentions(page = 1, limit = 10): Promise<TweetMention[]> {
    try {
      // Get current user ID first
      const me = await this.twitterClient.v2.me();
      console.log('User info:', me);

      // Get mentions using v2 API
      const mentions = await this.twitterClient.v2.userMentionTimeline(
        me.data.id,
        {
          max_results: 100,
          'tweet.fields': ['created_at', 'author_id'],
          expansions: ['author_id'],
          'user.fields': ['username', 'name'],
        },
      );
      console.log('Raw mentions response:', mentions);

      if (!mentions?.data?.data) {
        console.log('No mentions found, returning empty array');
        return [];
      }

      // Map the response to our TweetMention interface
      const mappedMentions: TweetMention[] = mentions.data.data.map((tweet) => {
        const author = mentions.includes.users.find(
          (user) => user.id === tweet.author_id,
        );
        return {
          id: tweet.id,
          text: tweet.text,
          author_id: tweet.author_id,
          author_username: author?.username || '',
          author_name: author?.name || '',
          created_at: tweet.created_at,
        };
      });

      // Apply pagination
      const start = (page - 1) * limit;
      return mappedMentions.slice(start, start + limit);
    } catch (error) {
      console.error('Error getting mentions:', error);
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

      throw new Error(`Failed to get mentions: ${error.message}`);
    }
  }

  /**
   * Search for posts mentioning a specific user
   */
  async searchUserMentions(
    username: string,
    limit = 20,
  ): Promise<MentionedPost[]> {
    try {
      // First, get the user ID from username
      const user = await this.twitterClient.v2.userByUsername(username);
      if (!user?.data?.id) {
        throw new Error(`User @${username} not found`);
      }

      // Search for tweets mentioning the user
      const tweets = await this.twitterClient.v2.search(`@${username}`, {
        max_results: limit,
        'tweet.fields': ['created_at', 'conversation_id', 'author_id'],
        expansions: ['author_id'],
        'user.fields': ['username', 'name'],
      });

      if (!tweets?.data?.data) {
        console.log('No mentions found, returning empty array');
        return [];
      }

      // Map the response to our MentionedPost interface
      const mentionedPosts: MentionedPost[] = tweets.data.data.map((tweet) => {
        const author = tweets.includes.users.find(
          (user) => user.id === tweet.author_id,
        );
        return {
          tweet_id: tweet.id,
          thread_id: tweet.conversation_id,
          text: tweet.text,
          author_username: author?.username || '',
          author_name: author?.name || '',
          created_at: tweet.created_at,
        };
      });

      return mentionedPosts;
    } catch (error) {
      console.error('Error searching user mentions:', error);
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

      throw new Error(`Failed to search user mentions: ${error.message}`);
    }
  }
}
