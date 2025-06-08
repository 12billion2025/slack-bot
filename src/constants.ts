import { Annotation } from '@langchain/langgraph';

export const StateAnnotation = Annotation.Root({
  userInput: Annotation<string>,
  channelId: Annotation<string>,
  threadId: Annotation<string | undefined>,
  questionType: Annotation<string>,
  response: Annotation<string>,
});

// Graph Node Names
export const NODE_NAMES = Object.freeze({
  CLASSIFY: 'classify',
  CONVERSATION_SERVICE: 'conversation_service',
  NOTION_SERVICE: 'notion_service',
  GITHUB_SERVICE: 'github_service',
});

// Question Types
export const QUESTION_TYPES = Object.freeze({
  CONVERSATION: 'conversation',
  NOTION: 'notion',
  GITHUB: 'github',
});

export const supportedExtensions = new Set([
  '.js',
  '.ts',
  '.jsx',
  '.tsx',
  '.py',
  '.java',
  '.cpp',
  '.c',
  '.h',
  '.cs',
  '.php',
  '.rb',
  '.go',
  '.rs',
  '.swift',
  '.kt',
  '.scala',
  '.html',
  '.css',
  '.scss',
  '.less',
  '.vue',
  '.svelte',
  '.md',
  '.txt',
  '.yaml',
  '.yml',
  '.xml',
  '.sql',
  '.sh',
  '.bash',
  '.zsh',
  '.fish',
  '.ps1',
  '.bat',
  '.cmd',
]);

// 제외할 디렉토리
export const excludedDirs = new Set([
  'node_modules',
  '.git',
  '.vscode',
  '.idea',
  '__pycache__',
  'venv',
  'env',
  '.env',
  'dist',
  'build',
  'target',
  'bin',
  '.next',
  '.nuxt',
  'coverage',
  '.nyc_output',
]);
