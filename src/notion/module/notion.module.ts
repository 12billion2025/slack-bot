import { Module } from '@nestjs/common';
import { NotionService } from '../service/notion.service';

@Module({
  providers: [NotionService],
  exports: [NotionService],
})
export class NotionModule {}