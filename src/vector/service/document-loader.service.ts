import { Injectable, Logger } from '@nestjs/common';
import { NotionService } from '../../notion/service/notion.service';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from '@langchain/core/documents';
import { GitHubService } from '../../github/service/github.service';

@Injectable()
export class DocumentLoaderService {
  private readonly logger = new Logger(DocumentLoaderService.name);
  private chroma: Chroma;

  constructor(
    private readonly notionService: NotionService,
    private readonly githubService: GitHubService,
    ) {
    this.chroma = new Chroma(
      new OpenAIEmbeddings(),
      {
        collectionName: process.env.CHROMA_COLLECTION ?? 'notion-pages',
        url: process.env.CHROMA_URL ?? 'http://localhost:8000',
      }
    );
  }

  async loadAndStoreDocuments() {
    const pages = await this.notionService.getAllPages();

    for (const page of pages) {
      const pageId = page.id;
      const titleProp = Object.values(page.properties)
        .find((p: any) => p.type === 'title' && Array.isArray((p as any).title));
      const title = (titleProp as any)?.title?.[0]?.plain_text ?? 'unknown title';

      const content = await this.notionService.getPageBlocksText(pageId);

      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 50,
      });

      const docs = await splitter.createDocuments([content]);

      // Attach metadata to each document
      const docsWithMetadata = docs.map(doc => ({
        ...doc,
        metadata: { ...(doc.metadata || {}), pageId, title },
      }));

      await this.chroma.addDocuments(docsWithMetadata);
      this.logger.log(`저장 완료: ${title} (${docsWithMetadata.length}개 조각)`);
    }
  }

  async loadGithubDocuments() {
    const readme = await this.githubService.getReadme();
    const commits = await this.githubService.getRecentCommits();
    const prs = await this.githubService.getRecentPullRequests();

    const rawText = [`📄 README\n${readme}`, ...commits, ...prs].join('\n\n');

    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
    const docs = await splitter.createDocuments([rawText]);

    // Attach metadata to each document
    const docsWithMetadata = docs.map(doc => ({
      ...doc,
      metadata: { ...(doc.metadata || {}), source: 'github', repo: process.env.GITHUB_REPO_NAME },
    }));

    await this.chroma.addDocuments(docsWithMetadata);
    this.logger.log(`GitHub 문서 ${docsWithMetadata.length}개 저장 완료`);
  }
}