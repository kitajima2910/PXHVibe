export type AgentEvent =
  | {type: 'text_delta'; content: string}
  | {type: 'activity'; content: string}
  | {type: 'tool_start'; toolName: string}
  | {type: 'tool_complete'; toolName: string; summary: string};

export interface AgentInputMessage {
  role: 'user';
  content: string;
}

export interface AgentToolOutput {
  type: 'function_call_output';
  callId: string;
  output: string;
}

export type AgentInput = AgentInputMessage | AgentToolOutput;

export interface AgentToolCall {
  callId: string;
  name: string;
  arguments: string;
}

export interface AgentModelTurn {
  id: string;
  text: string;
  toolCalls: readonly AgentToolCall[];
}

export interface AgentToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AgentTool extends AgentToolDefinition {
  execute(argumentsValue: unknown, cwd: string): Promise<string>;
}
