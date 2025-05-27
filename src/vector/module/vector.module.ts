import { Module } from '@nestjs/common';
import { DocumentLoaderService } from '../service/document-loader.service';
import { RetrievalService } from '../service/retrieval.service';
import { NotionModule } from '../../notion/module/notion.module';
import { GitHubModule } from '../../github/module/github.module';

@Module({
  imports: [NotionModule, GitHubModule],
  providers: [DocumentLoaderService, RetrievalService],
  exports: [DocumentLoaderService, RetrievalService],
})
export class VectorModule {}