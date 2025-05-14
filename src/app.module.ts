import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { SlackModule } from 'nestjs-slack-bolt';
import { AppService } from './app.service';

@Module({
  imports: [SlackModule.forRoot()],
  providers: [AppService],
  controllers: [AppController],
})
export class AppModule {}
