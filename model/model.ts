import { FactoryProvider } from '@nestjs/common';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { ConfigService } from '@nestjs/config';

export const LlmModelProvider: FactoryProvider<ChatOpenAI> = {
  provide: 'LLM_MODEL',
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    return new ChatOpenAI({
      apiKey: config.get('OPENAI_API_KEY'),
      modelName: config.get('OPENAI_DEFAULT_MODEL'),
      configuration: { baseURL: config.get('OPENAI_BASE_URL') },
      temperature: 0.7,
    });
  },
};

export const EmbeddingModelProvider: FactoryProvider<OpenAIEmbeddings> = {
  provide: 'EMBEDDING_MODEL',
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    return new OpenAIEmbeddings({
      apiKey: config.get('OPENAI_API_KEY'),
      model: config.get('OPENAI_EMBEDDING_MODEL'),
      configuration: { baseURL: config.get('OPENAI_BASE_URL') },
      dimensions: 1024,
    });
  },
};
