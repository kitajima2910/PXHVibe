import type {
  AgentInput,
  AgentModelTurn,
  AgentToolDefinition,
  AgentImage,
} from './types.js';

export interface ModelRequest {
  instructions: string;
  input: readonly AgentInput[];
  images?: readonly AgentImage[];
  tools: readonly AgentToolDefinition[];
  signal: AbortSignal;
  onTextDelta: (delta: string) => void;
}

export interface ModelProvider {
  createTurn(request: ModelRequest): Promise<AgentModelTurn>;
}
