import { Module } from '@nestjs/common';
import { NotionEmbeddingService } from './notion_embedding.service';
import { GithubEmbeddingController } from './github_embedding.controller';
import { NotionApiService } from './notion_api.service';
import { GithubEmbeddingService } from './github_embedding.service';

@Module({
  controllers: [GithubEmbeddingController],
  providers: [GithubEmbeddingService, NotionEmbeddingService, NotionApiService],
})
export class EmbeddingModule {}
