import { Module } from '@nestjs/common';
import { NotionPineconeProvider, GithubPineconeProvider } from './pinecone';
import { ModelModule } from '../model/model.module';

@Module({
  imports: [ModelModule],
  providers: [NotionPineconeProvider, GithubPineconeProvider],
  exports: ['NOTION_PINECONE_CLIENT', 'GITHUB_PINECONE_CLIENT'],
})
export class PineconeModule {}
