import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { SlackModule } from 'nestjs-slack-bolt';
import { ConversationsModule } from './conversations/conversations.module';
import { NotionModule } from './notion/notion.module';
import { GithubModule } from './github/github.module';
import { ModelModule } from 'model/model.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SlackModule.forRoot({
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      token: process.env.SLACK_BOT_TOKEN,
    }),
    ConversationsModule,
    NotionModule,
    GithubModule,
    ModelModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
