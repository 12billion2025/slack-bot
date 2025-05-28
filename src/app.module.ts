import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { SlackModule } from 'nestjs-slack-bolt';
import { AppService } from './app.service';
import { ConversationsModule } from './conversations/conversations.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    SlackModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    ConversationsModule,
  ],
  providers: [AppService],
  controllers: [AppController],
})
export class AppModule {}
