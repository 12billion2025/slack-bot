import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PineconeStore } from '@langchain/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Pinecone } from '@pinecone-database/pinecone';
import { NotionApiService } from '../notion/notion_api.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class NotionEmbeddingService {
  private readonly logger = new Logger(NotionEmbeddingService.name);
  private readonly pineconeStore: PineconeStore;

  constructor(
    private readonly notionApi: NotionApiService,
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
        namespace: 'notion-docs', // 네임스페이스로 구분
      }
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateEmbedding() {
    try {
      this.logger.log('Notion 임베딩 업데이트 시작');
      
      const pages = await this.notionApi.getRecentlyEditedPages(1);
      this.logger.log(`처리할 페이지 수: ${pages.length}`);

      for (const page of pages) {
        try {
          // 기존 임베딩 삭제 (중복 방지)
          await this.deleteExistingEmbeddings(page.id);
          
          const content = await this.notionApi.getPageBlocksText(page.id);
          
          if (!content.trim()) {
            this.logger.warn(`페이지 ${page.id}에 내용이 없습니다.`);
            continue;
          }

          const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 500,
            chunkOverlap: 50,
          });

          // 수정: metadata를 올바르게 전달
          const docs = await splitter.createDocuments(
            [content],
            [{
              pageId: page.id,
              lastEdited: page.last_edited_time,
              source: 'notion',
              title: page.properties?.title?.title?.[0]?.plain_text || 'Untitled',
            }]
          );

          await this.pineconeStore.addDocuments(docs);
          this.logger.log(`벡터 저장 완료: ${page.id}`);
          
        } catch (error) {
          this.logger.error(`페이지 ${page.id} 처리 중 오류:`, error);
        }
      }
      
      this.logger.log('Notion 임베딩 업데이트 완료');
    } catch (error) {
      this.logger.error('Notion 임베딩 업데이트 중 오류:', error);
    }
  }

  private async deleteExistingEmbeddings(pageId: string) {
    try {
      // Pinecone에서 해당 pageId의 기존 벡터들 삭제
      const pinecone = new Pinecone({
        apiKey: this.configService.get<string>('PINECONE_API_KEY')!,
      });
      
      const index = pinecone.Index(
        this.configService.get<string>('PINECONE_INDEX_NAME')!
      );

      await index.namespace('notion-docs').deleteMany({
        filter: { pageId: { $eq: pageId } }
      });
      
    } catch (error) {
      this.logger.warn(`기존 임베딩 삭제 중 오류 (pageId: ${pageId}):`, error);
    }
  }
}