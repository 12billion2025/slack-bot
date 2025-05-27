import { Injectable } from '@nestjs/common';
import { Client } from '@notionhq/client';

@Injectable()
export class NotionService {
  private notion: Client;
  private databaseId: string;

  constructor() {
    this.notion = new Client({ auth: process.env.NOTION_API_KEY });
    this.databaseId = process.env.NOTION_DATABASE_ID!;
  }

  async getAllPages(): Promise<any[]> {
    const response = await this.notion.databases.query({
      database_id: this.databaseId,
    });

    return response.results;
  }

  async getPageContent(pageId: string): Promise<any> {
    const response = await this.notion.blocks.children.list({
      block_id: pageId,
    });

    return response.results;
  }
}