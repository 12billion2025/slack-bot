import { Body, Controller, Post, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { WebClient } from '@slack/web-api';
import { ConfigService } from '@nestjs/config';
import { SlackEventSubscription } from '@types';
import { Response } from 'express';

@Controller()
export class AppController {
  private slackClient: WebClient;

  constructor(
    private readonly appService: AppService,
    private readonly config: ConfigService,
  ) {
    this.slackClient = new WebClient(this.config.get('SLACK_BOT_TOKEN'));
  }

  @Post()
  async subscribeSlackEvent(
    @Body() { event, challenge }: SlackEventSubscription,
    @Res() res: Response,
  ) {
    res.status(200).send(challenge);

    try {
      const reply = await this.appService.createCompletions(
        event.text,
        event.channel,
        event.thread_ts || event.ts,
      );

      this.slackClient.chat.postMessage({
        channel: event.channel,
        thread_ts: event.ts,
        text: reply,
      });
    } catch (error) {
      this.slackClient.chat.postMessage({
        channel: event.channel,
        thread_ts: event.ts,
        text: '오류가 발생했습니다. 다시 시도해주세요.',
      });
      console.error(error);
    }
  }
}
