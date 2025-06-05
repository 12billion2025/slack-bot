import { Inject, Injectable } from '@nestjs/common';
import {
  HumanMessage,
  BaseMessage,
  AIMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { WebClient } from '@slack/web-api';
import { MessageElement } from '@slack/web-api/dist/types/response/ConversationsRepliesResponse';
import { ChatOpenAI } from '@langchain/openai';
import { IChatService } from '@types';
import { StateAnnotation } from '../constants';

@Injectable()
export class ConversationsService implements IChatService {
  constructor(
    @Inject('LLM_MODEL') private readonly model: ChatOpenAI,
    @Inject('SLACK_CLIENT') private readonly slackClient: WebClient,
  ) {}

  public async invoke(
    state: typeof StateAnnotation.State,
  ): Promise<{ response: string }> {
    const systemMessage = new SystemMessage(
      'You are a helpful AI slack chatbot. Always respond in Korean. markdown format.' +
        'You can reference previous messages in this conversation to provide contextual responses.',
    );
    const conversations = await this.getConversations(
      state.channelId,
      state.threadId,
    );
    const userMessage = new HumanMessage(state.userInput);

    const messages = [systemMessage, ...conversations, userMessage];
    const result = await this.model.invoke(messages);

    const response =
      typeof result.content !== 'string'
        ? JSON.stringify(result.content)
        : result.content;

    return { response };
  }

  private async getConversations(
    channelId: string,
    threadId?: string,
  ): Promise<BaseMessage[]> {
    const slackMessages = threadId
      ? await this.getReplies(channelId, threadId)
      : await this.getHistory(channelId);

    return slackMessages.map((slackMessage) => {
      return slackMessage.bot_id
        ? new AIMessage(slackMessage.text)
        : new HumanMessage(slackMessage.text);
    });
  }

  private async getReplies(
    channelId: string,
    threadId: string,
  ): Promise<MessageElement[]> {
    const result = await this.slackClient.conversations.replies({
      channel: channelId,
      ts: threadId,
      limit: 20,
    });
    return result.messages.reverse() || [];
  }

  private async getHistory(channelId: string): Promise<MessageElement[]> {
    const result = await this.slackClient.conversations.history({
      channel: channelId,
      limit: 10,
    });
    return result.messages.reverse() || [];
  }
}
