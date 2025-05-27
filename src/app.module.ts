import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { SlackModule } from 'nestjs-slack-bolt';
import { AppService } from './app.service';
import { NotionModule } from './module/notion.module';

@Module({
  imports: [SlackModule.forRoot(), NotionModule],
  providers: [AppService],
  controllers: [AppController],
})

export class AppModule {}