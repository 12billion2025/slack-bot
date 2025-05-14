import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

@Injectable()
export class AppService {
  private chatModel: ChatOpenAI;

  constructor() {
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
    const response = await this.chatModel.invoke([
      new SystemMessage(
        'You are a helpful AI slack chatbot. Always respond in Korean. markdown format',
      ),
      new HumanMessage(userInput),
    ]);

    const replyContent = response.content;
    return typeof replyContent !== 'string'
      ? JSON.stringify(replyContent)
      : replyContent;
  }
}
