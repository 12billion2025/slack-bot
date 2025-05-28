import { BaseMessage } from '@langchain/core/messages';

declare global {
  export interface IMessageProviderService {
    getMessages(channelId: string, threadId?: string): Promise<BaseMessage[]>;
  }
}
