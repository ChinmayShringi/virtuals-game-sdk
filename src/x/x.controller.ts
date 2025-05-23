import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
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
    return this.xService.listThreads();
  }
}
