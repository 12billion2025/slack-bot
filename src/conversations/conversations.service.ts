import { Injectable } from '@nestjs/common';
import {
  HumanMessage,
  BaseMessage,
  AIMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { WebClient } from '@slack/web-api';
import { MessageElement } from '@slack/web-api/dist/types/response/ConversationsRepliesResponse';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ConversationsService implements IMessageProviderService {
  private slackClient: WebClient;

  constructor(private readonly config: ConfigService) {
    this.slackClient = new WebClient(this.config.get('SLACK_BOT_TOKEN'));
  }

  public async getMessages(
    channelId: string,
    threadId?: string,
  ): Promise<BaseMessage[]> {
    const systemMessage = new SystemMessage(
      'You can reference previous messages in this conversation to provide contextual responses.',
    );
    const conversations = await this.getConversations(channelId, threadId);
    return [systemMessage, ...conversations];
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
