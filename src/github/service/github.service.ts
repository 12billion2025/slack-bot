import { Injectable } from '@nestjs/common';
import { Octokit } from '@octokit/rest';

@Injectable()
export class GitHubService {
  private octokit: Octokit;
  private owner = process.env.GITHUB_REPO_OWNER!;
  private repo = process.env.GITHUB_REPO_NAME!;

  constructor() {
    this.octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  }

  async getReadme(): Promise<string> {
    const { data } = await this.octokit.repos.getReadme({
      owner: this.owner,
      repo: this.repo,
    });

    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return content;
  }

  async getRecentPullRequests(): Promise<string[]> {
    const { data } = await this.octokit.pulls.list({
      owner: this.owner,
      repo: this.repo,
      state: 'open',
      per_page: 5,
    });

    return data.map(pr => `#${pr.number} ${pr.title}\n${pr.body}`);
  }

  async getRecentCommits(): Promise<string[]> {
    const { data } = await this.octokit.repos.listCommits({
      owner: this.owner,
      repo: this.repo,
      per_page: 5,
    });

    return data.map(commit => `- ${commit.commit.message}`);
  }
}