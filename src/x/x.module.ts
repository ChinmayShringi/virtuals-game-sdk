import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GameModule } from '../game/game.module';
import { XController } from './x.controller';
import { XService } from './x.service';

@Module({
  imports: [
    ConfigModule,
    GameModule,
  ],
  controllers: [XController],
  providers: [XService],
  exports: [XService],
})
export class XModule {} 