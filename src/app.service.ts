import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { NotionService } from './service/notion.service';

@Injectable()
export class AppService {
  private chatModel: ChatOpenAI;

  constructor(private readonly notionService: NotionService) { // dependency injection
    this.chatModel = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      modelName: process.env.OPENAI_DEFAULT_MODEL,
      configuration: {
        baseURL: process.env.OPENAI_BASE_URL,
      },
      temperature: 0.7,
    });
  }

  async createCompletions(userInput: string): Promise<string> {
    // Fetch all pages from Notion
    const pages = await this.notionService.getAllPages();

    // Fetch content of each page
    const summaries = pages
      .map((page: any, idx: number) => {
        const titleProp = Object.values(page.properties).find(
          (p: any) => p.type === 'title',
        );
        const title = (titleProp as { title?: { plain_text?: string }[] })?.title?.[0]?.plain_text ?? 'unknown title';
        return `${idx + 1}. ${title}`;
      })
      .join('\n');


    const response = await this.chatModel.invoke([
      new SystemMessage(
        'You are a helpful AI slack chatbot. Always respond in Korean. markdown format. this is a notion database :\n' +
        `\n\n${summaries}` +
        '\n\nYou are a helpful AI assistant. You will answer the user\'s question based on the Notion database provided above. ' +
        'If the user asks for a summary, you will provide a summary of the Notion database. ' +
        'If the user asks for a specific page, you will provide the content of that page. ' +
        'If the user asks for a list of pages, you will provide a list of all pages in the Notion database. '
      ),
      new HumanMessage(userInput),
    ]);

    const replyContent = response.content;
    return typeof replyContent !== 'string'
      ? JSON.stringify(replyContent)
      : replyContent;
  }
}
