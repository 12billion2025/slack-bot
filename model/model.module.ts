import { Module } from '@nestjs/common';
import { EmbeddingModelProvider, LlmModelProvider } from './model';

@Module({
  providers: [LlmModelProvider, EmbeddingModelProvider],
  exports: ['LLM_MODEL', 'EMBEDDING_MODEL'],
})
export class ModelModule {}
