import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';

@Injectable()
export class GithubApiService {
  private readonly logger = new Logger(GithubApiService.name);
  private readonly octokit: Octokit;

  constructor(private readonly configService: ConfigService) {
    this.octokit = new Octokit({ 
      auth: this.configService.get<string>('GITHUB_TOKEN') 
    });
  }

  async getRecentIssues(owner: string, repo: string, since: string) {
    try {
      const res = await this.octokit.issues.listForRepo({ 
        owner, 
        repo, 
        since,
        state: 'all',
        sort: 'updated',
        direction: 'desc',
        per_page: 100,
      });
      return res.data;
    } catch (error) {
      this.logger.error(`GitHub Issues 조회 실패 (${owner}/${repo}):`, error);
      throw error;
    }
  }

  async getRecentPullRequests(owner: string, repo: string, since: string) {
    try {
      const res = await this.octokit.pulls.list({
        owner,
        repo,
        state: 'all',
        sort: 'updated',
        direction: 'desc',
        per_page: 100,
      });
      
      // since 날짜 이후의 PR만 필터링
      const sinceDate = new Date(since);
      const filteredPRs = res.data.filter(pr => 
        new Date(pr.updated_at) >= sinceDate
      );
      
      return filteredPRs;
    } catch (error) {
      this.logger.error(`GitHub Pull Requests 조회 실패 (${owner}/${repo}):`, error);
      throw error;
    }
  }

  async getRecentCommits(owner: string, repo: string, since: string) {
    try {
      const res = await this.octokit.repos.listCommits({ 
        owner, 
        repo, 
        since,
        per_page: 100,
      });
      return res.data;
    } catch (error) {
      this.logger.error(`GitHub Commits 조회 실패 (${owner}/${repo}):`, error);
      throw error;
    }
  }

  // 추가: 파일 내용 가져오기 (문서 파일들을 위해)
  async getFileContent(owner: string, repo: string, path: string, ref?: string) {
    try {
      const res = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });
      
      if ('content' in res.data && res.data.content) {
        // Base64 디코딩
        return Buffer.from(res.data.content, 'base64').toString('utf-8');
      }
      
      return '';
    } catch (error) {
      this.logger.error(`파일 내용 조회 실패 (${owner}/${repo}/${path}):`, error);
      throw error;
    }
  }

  // 추가: 최근 변경된 문서 파일들 가져오기
  async getRecentDocumentFiles(owner: string, repo: string, since: string) {
    try {
      const commits = await this.getRecentCommits(owner, repo, since);
      const documentFiles = new Set<string>();
      
      for (const commit of commits) {
        try {
          const commitDetail = await this.octokit.repos.getCommit({
            owner,
            repo,
            ref: commit.sha,
          });
          
          // 문서 파일 확장자 필터링
          const docExtensions = ['.md', '.txt', '.rst', '.adoc', '.org'];
          commitDetail.data.files?.forEach(file => {
            if (file.filename && docExtensions.some(ext => 
              file.filename!.toLowerCase().endsWith(ext)
            )) {
              documentFiles.add(file.filename);
            }
          });
        } catch (error) {
          this.logger.warn(`커밋 상세 조회 실패 (${commit.sha}):`, error);
        }
      }
      
      return Array.from(documentFiles);
    } catch (error) {
      this.logger.error(`문서 파일 조회 실패 (${owner}/${repo}):`, error);
      throw error;
    }
  }
}