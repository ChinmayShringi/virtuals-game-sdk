import { Injectable } from '@nestjs/common';
import { GameService } from '../game/game.service';

export interface Thread {
  id: string;
  title: string;
}

@Injectable()
export class XService {
  constructor(private readonly gameService: GameService) {}

  async listThreads(page?: number, limit?: number): Promise<Thread[]> {
    const tweets = await this.gameService.listTweets(page, limit);
    return tweets.map(tweet => ({
      id: tweet.id,
      title: tweet.content,
    }));
  }
} 