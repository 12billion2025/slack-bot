import { Injectable } from '@nestjs/common';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';
import { formatDocumentsAsString } from 'langchain/util/document';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

@Injectable()
export class RetrievalService {
  private readonly chroma: Chroma;
  private readonly chatModel: ChatOpenAI;

  constructor() {
    this.chroma = new Chroma(
      new OpenAIEmbeddings(),
      {
        url: process.env.CHROMA_URL ?? 'http://localhost:8000',
        collectionName: process.env.CHROMA_COLLECTION ?? 'project-docs',
      }
    );

    this.chatModel = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      modelName: process.env.OPENAI_DEFAULT_MODEL,
      configuration: { baseURL: process.env.OPENAI_BASE_URL },
      temperature: 0.7,
    });
  }

  async answerQuestion(userInput: string): Promise<string> {
    // 1. 유사 문서 검색
    const retriever = this.chroma.asRetriever({ k: 3 });
    const documents = await retriever.getRelevantDocuments(userInput);

    // 2. 문서 문자열로 변환
    const context = formatDocumentsAsString(documents);

    // 3. AI 메시지 구성
    const messages = [
      new SystemMessage(`You are a helpful AI slack chatbot. Always respond in Korean. markdown format.:\n\n${context}`),
      new HumanMessage(userInput),
    ];

    // 4. 응답 생성
    const response = await this.chatModel.invoke(messages);
    return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
  }
}