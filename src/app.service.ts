import { Injectable } from '@nestjs/common';
import { RetrievalService } from './vector/service/retrieval.service';

@Injectable()
export class AppService {
  constructor(private readonly retrievalService: RetrievalService) {}

  async createCompletions(userInput: string): Promise<string> {
    return await this.retrievalService.answerQuestion(userInput);
  }
}
