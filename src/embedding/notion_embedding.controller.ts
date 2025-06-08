import { Body, Controller, Logger, Post, UseGuards } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'prisma/prisma.service';
import { NotionEmbeddingService } from './notion_embedding.service';
import { ApiKeyGuard } from '../api-key.guard';

@Controller('notion-embedding')
export class NotionEmbeddingController {
  private readonly logger = new Logger(NotionEmbeddingController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notionEmbeddingService: NotionEmbeddingService,
  ) {
    this.updateEmbedding();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateEmbedding() {
    const tenants = await this.prisma.tenants.findMany({
      where: {
        notionApiKey: { not: null },
        notionDatabaseId: { not: null },
      },
    });

    for (const tenant of tenants) {
      try {
        await this.notionEmbeddingService.updateNotionPinecone(tenant);
      } catch (error) {
        this.logger.error(
          `테넌트 ${tenant.tenantId}의 Notion 임베딩 업데이트 실패:`,
          error,
        );
      }
    }
    this.logger.log('Notion 임베딩 업데이트 완료');
  }

  @Post('init')
  @UseGuards(ApiKeyGuard)
  async initEmbedding(@Body() body: { tenantId: string }) {
    const tenant = await this.prisma.tenants.findFirstOrThrow({
      where: { tenantId: body.tenantId },
    });

    try {
      await this.notionEmbeddingService.initNotionPinecone(tenant);
    } catch (error) {
      console.log(error);
      this.logger.error(
        `테넌트 ${tenant.tenantId}의 Notion 임베딩 초기화 실패:`,
        error,
      );
    }
    this.logger.log('Notion 임베딩 초기화 완료');
  }
}

//
