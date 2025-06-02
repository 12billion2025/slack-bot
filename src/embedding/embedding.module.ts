import { Module } from '@nestjs/common';
import { NotionEmbeddingService } from './notion_embedding.service';
import { GithubEmbeddingService } from './github_embedding.service';
import { NotionModule } from 'src/notion/notion.module';
import { GithubModule } from 'src/github/github.module';

@Module({
  imports: [NotionModule, GithubModule],
  providers: [GithubEmbeddingService, NotionEmbeddingService],
})
export class EmbeddingModule {}
