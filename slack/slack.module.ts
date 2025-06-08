import { Module } from '@nestjs/common';
import { SlackProvider } from './slack';

@Module({
  providers: [SlackProvider],
  exports: ['SLACK_CLIENT'],
})
export class SlackModule {}
