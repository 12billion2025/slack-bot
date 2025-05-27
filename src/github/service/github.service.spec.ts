import { Test } from '@nestjs/testing';
import { GitHubService } from './github.service';
import { ConfigModule } from '@nestjs/config';

describe('GitHubService', () => {
  let githubService: GitHubService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [GitHubService],
    }).compile();

    githubService = moduleRef.get(GitHubService);
  });

  it('should fetch README content', async () => {
    const readme = await githubService.getReadme();
    expect(typeof readme).toBe('string');
    expect(readme.length).toBeGreaterThan(0);
    console.log('README:', readme.slice(0, 300));
  });

  it('should fetch recent commits', async () => {
    const commits = await githubService.getRecentCommits();
    expect(Array.isArray(commits)).toBe(true);
    expect(commits.length).toBeGreaterThan(0);
    console.log('Commits:', commits.slice(0, 3));
  });

  it('should fetch recent pull requests', async () => {
    const prs = await githubService.getRecentPullRequests();
    expect(Array.isArray(prs)).toBe(true);
    expect(prs.length).toBeGreaterThan(0);
    console.log('PRs:', prs.slice(0, 3));
  });
});