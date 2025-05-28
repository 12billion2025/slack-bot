import { Module } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ModelModule } from 'model/model.module';

@Module({
  imports: [ModelModule],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
