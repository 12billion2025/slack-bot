import { Inject, Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { IChatService } from '@types';
import { StateAnnotation } from '../constants';
import { DocumentInterface } from '@langchain/core/documents';
import { Client } from '@notionhq/client';

@Injectable()
export class NotionService implements IChatService {
  private readonly notion: Client;
  private readonly databaseId: string;
  
  constructor(
    @Inject('NOTION_PINECONE_CLIENT') private readonly pinecone: PineconeStore,
    @Inject('LLM_MODEL') private readonly llm: ChatOpenAI,
  ) {
    this.notion = new Client({ auth: process.env.NOTION_API_KEY });
    this.databaseId = process.env.NOTION_DATABASE_ID!;
  }

  async invoke(
    state: typeof StateAnnotation.State,
  ): Promise<{ response: string }> {
    const similarDocs = await this.pinecone.similaritySearch(
      state.userInput,
      5,
    );

    if (similarDocs.length === 0)
      return { response: '죄송합니다. 관련된 노션 정보를 찾을 수 없습니다.' };

    const userMessage = new HumanMessage(state.userInput);
    const systemMessage = this.createSystemMessage(similarDocs);

    const llmResponse = await this.llm.invoke([systemMessage, userMessage]);

    const response =
      typeof llmResponse.content === 'string'
        ? llmResponse.content
        : '답변을 생성하는 중 오류가 발생했습니다.';

    return { response };
  }

  private createSystemMessage(
    documents: DocumentInterface<Record<string, any>>[],
  ): SystemMessage {
    const context = documents
      .map((doc, index) => `[문서 ${index + 1}]\n${doc.metadata.pageContent}`)
      .join('\n\n');

    console.log('context', context);
    return new SystemMessage(
      `당신은 노션 문서 전문 AI 어시스턴트입니다. 주어진 노션 문서들의 정보를 바탕으로 사용자의 질문에 정확하고 유용한 답변을 제공해주세요.

규칙:
1. 반드시 한국어로 답변해주세요
2. 주어진 노션 문서의 정보만을 사용해서 답변해주세요
3. 문서에 없는 정보는 추측하지 마세요
4. 답변은 자연스럽고 이해하기 쉽게 작성해주세요
5. 필요하다면 어떤 노션 페이지나 문서에서 정보를 가져왔는지 언급해주세요
6. 업무 프로세스, 가이드라인, 정책 등에 대한 질문에 특히 도움이 되도록 답변해주세요
7. 마크다운 형식을 활용하여 읽기 쉽게 구성해주세요

다음은 참고할 노션 문서들입니다:
${context}`,
    );
  }

  async getRecentlyEditedPages(daysAgo: number = 1): Promise<any[]> {
    const since = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    const response = await this.notion.databases.query({
      database_id: this.databaseId,
      filter: {
        timestamp: 'last_edited_time',
        last_edited_time: {
          on_or_after: since,
        },
      },
      sorts: [
        {
          timestamp: 'last_edited_time',
          direction: 'descending',
        },
      ],
    });

    return response.results;
  }

  async getPageBlocksText(pageId: string): Promise<string> {
    const blocks = await this.notion.blocks.children.list({ block_id: pageId });

    const texts = blocks.results
      .map((block: any) => {
        if (block.type === 'paragraph') {
          return block.paragraph.text.map((t: any) => t.plain_text).join('');
        }
        return ''; // 필요한 경우 다른 타입도 추가 처리 가능
      })
      .filter(text => text.trim() !== '');

    return texts.join('\n');
  }
}
