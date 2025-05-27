import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { SlackModule } from 'nestjs-slack-bolt';
import { AppService } from './app.service';
import { NotionModule } from './notion/module/notion.module';
import { VectorModule } from './vector/module/vector.module';

@Module({
  imports: [SlackModule.forRoot(), NotionModule, VectorModule],
  providers: [AppService],
  controllers: [AppController],
})

export class AppModule {}