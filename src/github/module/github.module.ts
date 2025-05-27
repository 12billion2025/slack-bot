import { Module } from '@nestjs/common';
import { GitHubService } from '../service/github.service';

@Module({
  providers: [GitHubService],
  exports: [GitHubService],
})
export class GitHubModule {}