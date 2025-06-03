import { Module } from '@nestjs/common';
import { NotionEmbeddingService } from './notion_embedding.service';
import { GithubEmbeddingService } from './github_embedding.service';
import { NotionModule } from 'src/notion/notion.module';
import { GithubModule } from 'src/github/github.module';
import { ModelModule } from '../../model/model.module';
import { PineconeModule } from '../../pinecone/pinecone.module';

@Module({
  imports: [NotionModule, GithubModule, ModelModule, PineconeModule],
  providers: [GithubEmbeddingService, NotionEmbeddingService],
})
export class EmbeddingModule {}
