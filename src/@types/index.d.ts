export interface IChatService {
  invoke(state: typeof StateAnnotation.State): Promise<{ response: string }>;
}

export type State = {
  input: string;
  chain?: string;
  output?: string;
};

export interface SlackBlock {
  [key: string]: any;
}

export interface SlackAppMentionEvent {
  user: string;
  type: 'app_mention';
  ts: string;
  client_msg_id: string;
  text: string;
  team: string;
  thread_ts?: string;
  parent_user_id?: string;
  blocks: SlackBlock[];
  channel: string;
  event_ts: string;
}

export interface SlackAuthorization {
  enterprise_id: string | null;
  team_id: string;
  user_id: string;
  is_bot: boolean;
  is_enterprise_install: boolean;
}

export interface SlackEventSubscription {
  token: string;
  team_id: string;
  api_app_id: string;
  event: SlackAppMentionEvent;
  type: 'event_callback';
  event_id: string;
  event_time: number;
  authorizations: SlackAuthorization[];
  is_ext_shared_channel: boolean;
  event_context: string;
  challenge?: string;
}
