import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PineconeStore } from '@langchain/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Pinecone } from '@pinecone-database/pinecone';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GithubApiService } from '../github/github_api.service';

@Injectable()
export class GithubEmbeddingService {
  private readonly logger = new Logger(GithubEmbeddingService.name);
  private readonly pineconeStore: PineconeStore;

  constructor(
    private readonly githubApi: GithubApiService,
    private readonly configService: ConfigService,
  ) {
    // Pinecone 클라이언트 직접 초기화
    const pinecone = new Pinecone({
      apiKey: this.configService.get<string>('PINECONE_API_KEY')!,
    });
    
    const pineconeIndex = pinecone.Index(
      this.configService.get<string>('PINECONE_INDEX_NAME')!
    );

    this.pineconeStore = new PineconeStore(
      new OpenAIEmbeddings({
        openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
      }),
      {
        pineconeIndex,
        namespace: 'github-docs', // Notion과 구분되는 네임스페이스
      }
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateEmbedding() {
    try {
      this.logger.log('GitHub 임베딩 업데이트 시작');
      
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const owner = this.configService.get<string>('GITHUB_REPO_OWNER')!;
      const repo = this.configService.get<string>('GITHUB_REPO_NAME')!;

      const [issues, prs, commits] = await Promise.all([
        this.githubApi.getRecentIssues(owner, repo, since),
        this.githubApi.getRecentPullRequests(owner, repo, since),
        this.githubApi.getRecentCommits(owner, repo, since),
      ]);

      // Issues 처리
      for (const issue of issues) {
        if (!issue.body?.trim()) continue;
        
        try {
          await this.deleteExistingEmbeddings(`issue-${issue.number}`);
          await this.processDocument(
            `# Issue #${issue.number}: ${issue.title}\n\n${issue.body}`,
            {
              type: 'issue',
              id: `issue-${issue.number}`,
              number: issue.number,
              title: issue.title,
              url: issue.html_url,
              updatedAt: issue.updated_at,
              source: 'github',
            }
          );
        } catch (error) {
          this.logger.error(`Issue #${issue.number} 처리 중 오류:`, error);
        }
      }

      // Pull Requests 처리
      for (const pr of prs) {
        if (!pr.body?.trim()) continue;
        
        try {
          await this.deleteExistingEmbeddings(`pr-${pr.number}`);
          await this.processDocument(
            `# PR #${pr.number}: ${pr.title}\n\n${pr.body}`,
            {
              type: 'pull_request',
              id: `pr-${pr.number}`,
              number: pr.number,
              title: pr.title,
              url: pr.html_url,
              updatedAt: pr.updated_at,
              source: 'github',
            }
          );
        } catch (error) {
          this.logger.error(`PR #${pr.number} 처리 중 오류:`, error);
        }
      }

      // Commits 처리
      for (const commit of commits) {
        if (!commit.commit.message?.trim()) continue;
        
        try {
          await this.deleteExistingEmbeddings(`commit-${commit.sha}`);
          await this.processDocument(
            `# Commit ${commit.sha.substring(0, 7)}\n\n${commit.commit.message}`,
            {
              type: 'commit',
              id: `commit-${commit.sha}`,
              sha: commit.sha,
              message: commit.commit.message,
              url: commit.html_url,
              date: commit.commit.author?.date,
              source: 'github',
            }
          );
        } catch (error) {
          this.logger.error(`Commit ${commit.sha} 처리 중 오류:`, error);
        }
      }

      this.logger.log(`GitHub 임베딩 업데이트 완료 - Issues: ${issues.length}, PRs: ${prs.length}, Commits: ${commits.length}`);
    } catch (error) {
      this.logger.error('GitHub 임베딩 업데이트 중 오류:', error);
    }
  }

  private async processDocument(content: string, metadata: any) {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
    });

    const docs = await splitter.createDocuments([content], [metadata]);
    await this.pineconeStore.addDocuments(docs);
    
    this.logger.log(`벡터 저장 완료: ${metadata.type} ${metadata.id}`);
  }

  private async deleteExistingEmbeddings(id: string) {
    try {
      const pinecone = new Pinecone({
        apiKey: this.configService.get<string>('PINECONE_API_KEY')!,
      });
      
      const index = pinecone.Index(
        this.configService.get<string>('PINECONE_INDEX_NAME')!
      );

      await index.namespace('github-docs').deleteMany({
        filter: { id: { $eq: id } }
      });
      
    } catch (error) {
      this.logger.warn(`기존 임베딩 삭제 중 오류 (id: ${id}):`, error);
    }
  }
}