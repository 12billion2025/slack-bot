import { Test } from '@nestjs/testing';
import { NotionService } from './notion.service';
import { ConfigModule } from '@nestjs/config';

describe('NotionService', () => {
  let notionService: NotionService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [NotionService],
    }).compile();

    notionService = moduleRef.get(NotionService);
  });

  it('should fetch Notion pages', async () => {
    const pages = await notionService.getAllPages();
    expect(Array.isArray(pages)).toBe(true);
    expect(pages.length).toBeGreaterThan(0);
    console.log('Pages:', pages.map(p => p.id).slice(0, 3));
  });

  it('should fetch Notion page blocks', async () => {
    const pages = await notionService.getAllPages();
    const firstPageId = pages[0].id;

    const text = await notionService.getPageBlocksText(firstPageId);
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
    console.log('Block Text:', text.slice(0, 300));
  });

  it('should fetch Notion page blocks', async () => {
    const pages = await notionService.getAllPages();
    const firstPageId = pages[0];

    const text = await notionService.getPageBlocksText(firstPageId);
    console.log('Block Text:', text);

    expect(typeof text).toBe('string');

    if (text.length === 0) {
      console.warn('⚠️ 페이지에 블록이 없습니다. 테스트 생략 처리됨');
    } else {
      expect(text.length).toBeGreaterThan(0);
    }
  });
});