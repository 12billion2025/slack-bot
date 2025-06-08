import { Module } from '@nestjs/common';
import { NotionEmbeddingService } from './notion_embedding.service';
import { GithubEmbeddingService } from './github_embedding.service';
import { GithubApiService } from './github_api.service';
import { NotionApiService } from './notion_api.service';

@Module({
  providers: [
    GithubEmbeddingService,
    NotionEmbeddingService,
    GithubApiService,
    NotionApiService,
  ],
})
export class EmbeddingModule {}
