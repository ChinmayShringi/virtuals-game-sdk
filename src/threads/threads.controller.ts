import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ThreadsService, Thread } from './threads.service';

@ApiTags('threads')
@Controller('threads')
export class ThreadsController {
  constructor(private readonly threadsService: ThreadsService) {}

  @Get()
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
    return this.threadsService.listThreads(page, limit);
  }
} 