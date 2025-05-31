import { Injectable } from '@nestjs/common';
import { Client } from '@notionhq/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotionApiService {
  private readonly notion: Client;
  private readonly databaseId: string;

  constructor(private configService: ConfigService) {
    this.notion = new Client({ 
      auth: this.configService.get<string>('NOTION_API_KEY') 
    });
    this.databaseId = this.configService.get<string>('NOTION_DATABASE_ID')!;
  }

  async getRecentlyEditedPages(daysAgo: number = 1): Promise<any[]> {
    const since = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    const response = await this.notion.databases.query({
      database_id: this.databaseId,
      filter: {
        property: 'last_edited_time', // property
        date: {
          on_or_after: since,
        },
      },
      sorts: [
        {
          property: 'last_edited_time', // property
          direction: 'descending',
        },
      ],
    });

    return response.results;
  }

  async getPageBlocksText(pageId: string): Promise<string> {
    const blocks = await this.notion.blocks.children.list({ block_id: pageId });

    const texts = blocks.results
      .map((block: any) => {
        if (block.type === 'paragraph') {
          // 수정: text -> rich_text
          return block.paragraph.rich_text.map((t: any) => t.plain_text).join('');
        }
        // 다른 블록 타입들도 처리
        if (block.type === 'heading_1') {
          return block.heading_1.rich_text.map((t: any) => t.plain_text).join('');
        }
        if (block.type === 'heading_2') {
          return block.heading_2.rich_text.map((t: any) => t.plain_text).join('');
        }
        if (block.type === 'heading_3') {
          return block.heading_3.rich_text.map((t: any) => t.plain_text).join('');
        }
        if (block.type === 'bulleted_list_item') {
          return block.bulleted_list_item.rich_text.map((t: any) => t.plain_text).join('');
        }
        if (block.type === 'numbered_list_item') {
          return block.numbered_list_item.rich_text.map((t: any) => t.plain_text).join('');
        }
        return '';
      })
      .filter(text => text.trim() !== '');

    return texts.join('\n');
  }
}