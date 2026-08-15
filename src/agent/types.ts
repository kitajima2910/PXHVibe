export type AgentEvent =
  | {type: 'text_delta'; content: string}
  | {type: 'activity'; content: string}
  | {type: 'tool_start'; toolName: string}
  | {type: 'tool_complete'; toolName: string; summary: string};

export interface AgentInputMessage {
  role: 'user';
  content: string;
}

export type AgentImage = ImageAttachment;

export interface AgentToolOutput {
  type: 'function_call_output';
  callId: string;
  output: string;
}

export interface AgentAssistantTurn {
  role: 'assistant';
  toolCalls: readonly AgentToolCall[];
  text?: string;
}

export type AgentInput = AgentInputMessage | AgentToolOutput | AgentAssistantTurn;

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
import type {ImageAttachment} from '../types/attachment.js';
