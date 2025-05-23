import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { XController } from './x.controller';
import { XService } from './x.service';
import { configuration, validate } from '../config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      validate,
      isGlobal: true,
    }),
  ],
  controllers: [XController],
  providers: [XService],
  exports: [XService],
})
export class XModule {}
