import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import { XService, Thread } from './x.service';

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
        reasoning: { type: 'string', description: 'Reasoning behind the tweet' },
      },
      required: ['content', 'reasoning'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tweet posted successfully',
  })
  async postTweet(
    @Body('content') content: string,
    @Body('reasoning') reasoning: string,
  ): Promise<void> {
    await this.xService.postTweet(content, reasoning);
  }
}
