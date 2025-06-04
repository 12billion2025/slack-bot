import { Inject, Injectable } from '@nestjs/common';
import { ConversationsService } from './conversations/conversations.service';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StateGraph, END } from '@langchain/langgraph';
import { NotionService } from './notion/notion.service';
import { GithubService } from './github/github.service';
import { StateAnnotation, NODE_NAMES, QUESTION_TYPES } from './constants';

@Injectable()
export class AppService {
  constructor(
    @Inject('LLM_MODEL') private readonly llm: ChatOpenAI,
    private readonly conversationsService: ConversationsService,
    private readonly notionService: NotionService,
    private readonly githubService: GithubService,
  ) {}

  private graph = this.initializeGraph();

  private initializeGraph() {
    const builder = new StateGraph(StateAnnotation);

    return builder
      .addNode(NODE_NAMES.CLASSIFY, (state) => this.classifyQuestion(state))
      .addNode(NODE_NAMES.CONVERSATION_SERVICE, (state) =>
        this.conversationsService.invoke(state),
      )
      .addNode(NODE_NAMES.NOTION_SERVICE, (state) =>
        this.notionService.invoke(state),
      )
      .addNode(NODE_NAMES.GITHUB_SERVICE, (state) =>
        this.githubService.invoke(state),
      )
      .addEdge('__start__', NODE_NAMES.CLASSIFY)
      .addConditionalEdges(NODE_NAMES.CLASSIFY, (state) =>
        this.routeQuestion(state),
      )
      .addEdge(NODE_NAMES.CONVERSATION_SERVICE, END)
      .addEdge(NODE_NAMES.NOTION_SERVICE, END)
      .addEdge(NODE_NAMES.GITHUB_SERVICE, END)
      .compile();
  }

  private async classifyQuestion(state: typeof StateAnnotation.State) {
    const systemMessage = new SystemMessage(
      `사용자의 질문을 분석하여 다음 중 하나로 분류해주세요:
      - "${QUESTION_TYPES.CONVERSATION}": 일반적인 대화, 채팅, 질문답변
      - "${QUESTION_TYPES.NOTION}": 노션 문서 검색, 업무 프로세스, 가이드라인, 정책 조회
      - "${QUESTION_TYPES.GITHUB}": 깃허브 코드 검색, 기술 문서, API 문서, 개발 관련 질문
      
      오직 "${QUESTION_TYPES.CONVERSATION}", "${QUESTION_TYPES.NOTION}", 또는 "${QUESTION_TYPES.GITHUB}" 중 하나만 응답해주세요.`,
    );
    const userMessage = new HumanMessage(state.userInput);

    const response = await this.llm.invoke([systemMessage, userMessage]);
    const questionType =
      typeof response.content === 'string'
        ? response.content.toLowerCase().trim()
        : QUESTION_TYPES.CONVERSATION;

    console.log('questionType', questionType);

    // 분류 로직 개선
    if (questionType.includes(QUESTION_TYPES.GITHUB)) {
      return { questionType: QUESTION_TYPES.GITHUB };
    } else if (questionType.includes(QUESTION_TYPES.NOTION)) {
      return { questionType: QUESTION_TYPES.NOTION };
    } else {
      return { questionType: QUESTION_TYPES.CONVERSATION };
    }
  }

  private routeQuestion(state: typeof StateAnnotation.State) {
    switch (state.questionType) {
      case QUESTION_TYPES.GITHUB:
        return NODE_NAMES.GITHUB_SERVICE;
      case QUESTION_TYPES.NOTION:
        return NODE_NAMES.NOTION_SERVICE;
      default:
        return NODE_NAMES.CONVERSATION_SERVICE;
    }
  }

  public async createCompletions(
    userInput: string,
    channelId: string,
    threadId?: string,
  ): Promise<string> {
    const result = await this.graph.invoke({
      userInput,
      channelId,
      threadId,
    });

    return result.response;
  }
}
