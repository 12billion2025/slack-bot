export interface IChatService {
  invoke(state: typeof StateAnnotation.State): Promise<{ response: string }>;
}

export type State = {
  input: string;
  chain?: string;
  output?: string;
};
