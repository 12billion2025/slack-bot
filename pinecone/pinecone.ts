import { FactoryProvider } from '@nestjs/common';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { ConfigService } from '@nestjs/config';

export const NotionPineconeProvider: FactoryProvider<PineconeStore> = {
  provide: 'NOTION_PINECONE_CLIENT',
  inject: [ConfigService, 'EMBEDDING_MODEL'],
  useFactory: async (config: ConfigService, embeddings: OpenAIEmbeddings) => {
    const pinecone = new Pinecone({ apiKey: config.get('PINECONE_API_KEY') });
    const index = pinecone.Index('notion-notes-embeddings'); // 노션 전용 인덱스
    return await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index,
    });
  },
};

export const GithubPineconeProvider: FactoryProvider<PineconeStore> = {
  provide: 'GITHUB_PINECONE_CLIENT',
  inject: [ConfigService, 'EMBEDDING_MODEL'],
  useFactory: async (config: ConfigService, embeddings: OpenAIEmbeddings) => {
    const pinecone = new Pinecone({ apiKey: config.get('PINECONE_API_KEY') });
    const index = pinecone.Index('github-code-embeddings'); // 깃허브 전용 인덱스
    return await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index,
    });
  },
};
