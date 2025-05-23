import { Injectable } from '@nestjs/common';

export interface Thread {
  id: string;
  title: string;
}

@Injectable()
export class ThreadsService {
  async listThreads(page: number = 1, limit: number = 10): Promise<Thread[]> {
    // TODO: Implement actual database query
    // This is a mock implementation
    return [
      { id: '1', title: 'Sample Thread 1' },
      { id: '2', title: 'Sample Thread 2' },
    ];
  }
} 