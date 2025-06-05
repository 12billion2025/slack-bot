import { Module } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ModelModule } from 'model/model.module';
import { SlackModule } from 'slack/slack.module';

@Module({
  imports: [ModelModule, SlackModule],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
