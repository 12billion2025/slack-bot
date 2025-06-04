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
