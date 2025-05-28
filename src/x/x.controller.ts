import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import {
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import {
  XService,
  Thread,
  TweetAnalytics,
  TweetMention,
  ThreadPost,
} from './x.service';

@ApiTags('Threads')
@Controller('x')
export class XController {
  constructor(private readonly xService: XService) {}

  @Get('thread')
  @ApiOperation({ summary: 'List all threads' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
  })
  @ApiResponse({
    status: 200,
    description: 'List of threads',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
        },
      },
    },
  })
  async listThreads(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<Thread[]> {
    return this.xService.listThreads(page, limit);
  }

  @Post('tweet')
  @ApiOperation({ summary: 'Post a new tweet' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Tweet content' },
        mentions: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of usernames to mention (without @)',
        },
      },
      required: ['content'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tweet posted successfully',
  })
  async postTweet(
    @Body('content') content: string,
    @Body('mentions') mentions?: string[],
  ): Promise<void> {
    await this.xService.postTweet(content, mentions);
  }

  @Post('reply')
  @ApiOperation({ summary: 'Reply to a tweet' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tweetId: { type: 'string', description: 'ID of the tweet to reply to' },
        content: { type: 'string', description: 'Reply content' },
      },
      required: ['tweetId', 'content'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Reply posted successfully',
  })
  async replyToTweet(
    @Body('tweetId') tweetId: string,
    @Body('content') content: string,
  ): Promise<void> {
    await this.xService.replyToTweet(tweetId, content);
  }

  @Post('like/:tweetId')
  @ApiOperation({ summary: 'Like a tweet' })
  @ApiParam({
    name: 'tweetId',
    description: 'ID of the tweet to like',
  })
  @ApiResponse({
    status: 201,
    description: 'Tweet liked successfully',
  })
  async likeTweet(@Param('tweetId') tweetId: string): Promise<void> {
    await this.xService.likeTweet(tweetId);
  }

  @Get('analytics/:tweetId')
  @ApiOperation({ summary: 'Get tweet analytics' })
  @ApiParam({
    name: 'tweetId',
    description: 'ID of the tweet to get analytics for',
  })
  @ApiResponse({
    status: 200,
    description: 'Tweet analytics',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        text: { type: 'string' },
        likes: { type: 'number' },
        retweets: { type: 'number' },
        replies: { type: 'number' },
        views: { type: 'number' },
        created_at: { type: 'string' },
      },
    },
  })
  async getTweetAnalytics(
    @Param('tweetId') tweetId: string,
  ): Promise<TweetAnalytics> {
    return this.xService.getTweetAnalytics(tweetId);
  }

  @Get('mentions')
  @ApiOperation({ summary: 'Get mentions for the authenticated user' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
  })
  @ApiResponse({
    status: 200,
    description: 'List of mentions',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          text: { type: 'string' },
          author_id: { type: 'string' },
          author_username: { type: 'string' },
          author_name: { type: 'string' },
          created_at: { type: 'string' },
        },
      },
    },
  })
  async getMentions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<TweetMention[]> {
    return this.xService.getMentions(page, limit);
  }

  @Post('thread')
  @ApiOperation({ summary: 'Post a new thread' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        posts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              content: { type: 'string', description: 'Tweet content' },
              mentions: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of usernames to mention (without @)',
              },
            },
            required: ['content'],
          },
          description: 'Array of posts to create the thread',
        },
      },
      required: ['posts'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Thread posted successfully',
  })
  async postThread(@Body('posts') posts: ThreadPost[]): Promise<void> {
    await this.xService.postThread(posts);
  }
}
