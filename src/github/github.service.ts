import { Inject, Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { IChatService } from '@types';
import { StateAnnotation } from '../constants';
import { DocumentInterface } from '@langchain/core/documents';

@Injectable()
export class GithubService implements IChatService {
  constructor(
    @Inject('GITHUB_PINECONE_CLIENT') private readonly pinecone: PineconeStore,
    @Inject('LLM_MODEL') private readonly llm: ChatOpenAI,
  ) {}

  async invoke(
    state: typeof StateAnnotation.State,
  ): Promise<{ response: string }> {
    const similarDocs = await this.pinecone.similaritySearch(
      state.userInput,
      5,
    );

    if (similarDocs.length === 0)
      return { response: '죄송합니다. 관련된 깃허브 정보를 찾을 수 없습니다.' };

    const userMessage = new HumanMessage(state.userInput);
    const systemMessage = this.createSystemMessage(similarDocs);

    const llmResponse = await this.llm.invoke([systemMessage, userMessage]);

    const response =
      typeof llmResponse.content === 'string'
        ? llmResponse.content
        : '답변을 생성하는 중 오류가 발생했습니다.';

    return { response };
  }

  private createSystemMessage(
    documents: DocumentInterface<Record<string, any>>[],
  ): SystemMessage {
    const context = documents
      .map((doc, index) => `[문서 ${index + 1}]\n${doc.metadata.pageContent}`)
      .join('\n\n');

    return new SystemMessage(
      `당신은 깃허브 코드 및 문서 전문 AI 어시스턴트입니다. 주어진 깃허브 문서들의 정보를 바탕으로 사용자의 질문에 정확하고 유용한 답변을 제공해주세요.

        규칙:
        1. 반드시 한국어로 답변해주세요
        2. 주어진 깃허브 문서의 정보만을 사용해서 답변해주세요
        3. 코드 관련 질문의 경우 구체적인 예시와 함께 설명해주세요
        4. 문서에 없는 정보는 추측하지 마세요
        5. 답변은 자연스럽고 이해하기 쉽게 작성해주세요
        6. 필요하다면 어떤 파일이나 문서에서 정보를 가져왔는지 언급해주세요
        7. 슬랙 포맷팅을 사용하세요: *굵게*, _기울임_, \`인라인 코드\`, \`\`\`코드 블록\`\`\`

      다음은 참고할 깃허브 문서들입니다:
      ${context}`,
    );
  }
}
