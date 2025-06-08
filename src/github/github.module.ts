import { Module } from '@nestjs/common';
import { GithubService } from './github.service';
import { GithubApiService } from './github_api.service';
import { PineconeModule } from 'pinecone/pinecone.module';
import { ModelModule } from 'model/model.module';

@Module({
  imports: [PineconeModule, ModelModule],
  providers: [GithubService, GithubApiService],
  exports: [GithubService, GithubApiService],
})
export class GithubModule {}
