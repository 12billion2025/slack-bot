import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import {
  HumanMessage,
  SystemMessage,
  BaseMessage,
} from '@langchain/core/messages';
import { ConversationsService } from './conversations/conversations.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  private chatModel: ChatOpenAI;

  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly config: ConfigService,
  ) {
    this.chatModel = new ChatOpenAI({
      apiKey: this.config.get('OPENAI_API_KEY'),
      modelName: this.config.get('OPENAI_DEFAULT_MODEL'),
      configuration: { baseURL: this.config.get('OPENAI_BASE_URL') },
      temperature: 0.7,
    });
  }

  async createCompletions(
    userInput: string,
    channelId: string,
    threadId?: string,
  ): Promise<string> {
    const messages: BaseMessage[] = [];

    const systemMessage = this.getSystemMessage();
    const conversations = await this.conversationsService.getMessages(
      channelId,
      threadId,
    );

    messages.push(systemMessage);
    messages.push(...conversations);
    messages.push(new HumanMessage(userInput));

    const response = await this.chatModel.invoke(messages);

    return typeof response.content !== 'string'
      ? JSON.stringify(response.content)
      : response.content;
  }

  private getSystemMessage(): SystemMessage {
    return new SystemMessage(
      'You are a helpful AI slack chatbot. Always respond in Korean. markdown format.',
    );
  }
}
