import { Body, Controller, Logger, Post, Res, UseGuards } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'prisma/prisma.service';
import { GithubEmbeddingService } from './github_embedding.service';
import { ApiKeyGuard } from '../api-key.guard';
import { Response } from 'express';

@Controller('github-embedding')
export class GithubEmbeddingController {
  private readonly logger = new Logger(GithubEmbeddingController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly githubEmbeddingService: GithubEmbeddingService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async updateEmbedding() {
    const tenants = await this.prisma.tenants.findMany();

    for (const tenant of tenants) {
      try {
        await this.githubEmbeddingService.updateGitubPinecone(
          tenant,
          (octokit, owner, repo) =>
            this.githubEmbeddingService.getRecentlyChangedFiles(
              octokit,
              owner,
              repo,
            ),
        );
      } catch (error) {
        this.logger.error(
          `테넌트 ${tenant.id}의 GitHub 임베딩 업데이트 실패:`,
          error,
        );
      }
    }
    console.log('done');
  }

  @Post('init')
  @UseGuards(ApiKeyGuard)
  async initEmbedding(
    @Body() body: { tenantId: string },
    @Res() res: Response,
  ) {
    res.status(200).json({ message: 'GitHub 임베딩 초기화 시작' });

    const tenant = await this.prisma.tenants.findFirstOrThrow({
      where: { tenantId: body.tenantId },
      orderBy: { updatedAt: 'desc' },
    });

    try {
      await this.githubEmbeddingService.updateGitubPinecone(
        tenant,
        (octokit, owner, repo) =>
          this.githubEmbeddingService.getRepositoryFiles(octokit, owner, repo),
      );
    } catch (error) {
      this.logger.error(
        `테넌트 ${tenant.id}의 GitHub 임베딩 업데이트 실패:`,
        error,
      );
    }
    console.log('done');
  }
}
