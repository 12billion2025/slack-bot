import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ConversationsModule } from './conversations/conversations.module';
import { NotionModule } from './notion/notion.module';
import { ScheduleModule } from '@nestjs/schedule'; // notion을 위한 스케줄러 모듈
import { GithubModule } from './github/github.module';
import { ModelModule } from 'model/model.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { PrismaModule } from 'prisma/prisma.module';
import { SlackModule } from 'slack/slack.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(), // notion을 위한 스케줄러 모듈
    PrismaModule,
    ConversationsModule,
    NotionModule,
    GithubModule,
    ModelModule,
    EmbeddingModule,
    SlackModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
