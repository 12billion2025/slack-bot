import { Module } from '@nestjs/common';
import { NotionService } from './notion.service';
import { NotionApiService } from './notion_api.service';
import { PineconeModule } from 'pinecone/pinecone.module';
import { ModelModule } from 'model/model.module';

@Module({
  imports: [PineconeModule, ModelModule],
  providers: [NotionService, NotionApiService],
  exports: [NotionService, NotionApiService],
})
export class NotionModule {}
