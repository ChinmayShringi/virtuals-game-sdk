import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { XModule } from './x/x.module';

@Module({
  imports: [XModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
