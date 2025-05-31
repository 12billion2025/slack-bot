import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { PineconeStore } from '@langchain/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { NotionService } from '../notion/notion.service'; // 네가 구현한 Notion API 호출 클래스
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class NotionEmbeddingService {
  private readonly logger = new Logger(NotionEmbeddingService.name);

  constructor(
    private readonly notion: NotionService,
    @Inject('NOTION_PINECONE_CLIENT') private readonly pinecone: PineconeStore,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateEmbedding() {
    const pages = await this.notion.getRecentlyEditedPages(1); // timestamp 필터 적용
    for (const page of pages) {
      const content = await this.notion.getPageBlocksText(page.id);
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 50,
      });
      const docs = await splitter.createDocuments([content], [
        { pageContent: content, pageId: page.id, lastEdited: page.last_edited_time },
      ]);
      await this.pinecone.addDocuments(docs);
      this.logger.log(`✅ 벡터 저장 완료: ${page.id}`);
    }
  }
}