import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { SlackModule } from 'nestjs-slack-bolt';
import { ConversationsModule } from './conversations/conversations.module';
import { NotionModule } from './notion/notion.module';
import { ScheduleModule } from '@nestjs/schedule'; // notion을 위한 스케줄러 모듈
import { GithubModule } from './github/github.module';
import { ModelModule } from 'model/model.module';
import { EmbeddingModule } from './embedding/embedding.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SlackModule.forRoot({
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      token: process.env.SLACK_BOT_TOKEN,
    }),
    ScheduleModule.forRoot(), // notion을 위한 스케줄러 모듈
    ConversationsModule,
    NotionModule,
    GithubModule,
    ModelModule,
    EmbeddingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
