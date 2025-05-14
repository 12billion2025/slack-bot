import { Controller } from '@nestjs/common';
import { Event } from 'nestjs-slack-bolt';
import { SlackEventMiddlewareArgs } from '@slack/bolt';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Event('app_mention')
  async event({ event, say }: SlackEventMiddlewareArgs<'app_mention'>) {
    try {
      const reply = await this.appService.createCompletions(event.text);
      await say({
        text: reply,
        thread_ts: event.ts,
      });
    } catch (error) {
      await say({
        text: '오류가 발생했습니다. 다시 시도해주세요.',
        thread_ts: event.ts,
      });
      console.error(error);
    }
  }
}
