import type {ModelProvider} from './ModelProvider.js';
import type {AgentEvent, AgentImage, AgentInput, AgentTool} from './types.js';

const instructions = `You are PXHVibe, a coding agent working in the user's current project.
Use the available tools to inspect and edit the project before answering.
Never claim a file was changed unless a tool result confirms it.
Keep changes minimal and stay inside the workspace.
There is no shell tool. If verification requires a command, explain that limitation.`;

export class AgentRuntime {
  private previousResponseId: string | undefined;
  private tools: readonly AgentTool[];

  constructor(
    private readonly model: ModelProvider,
    tools: readonly AgentTool[],
    private readonly maxTurns = 12,
  ) {
    this.tools = tools;
  }

  setTools(tools: readonly AgentTool[]): void {
    this.tools = tools;
  }

  async run(
    prompt: string,
    cwd: string,
    signal: AbortSignal,
    onEvent: (event: AgentEvent) => void,
    images: readonly AgentImage[] = [],
  ): Promise<string> {
    let input: AgentInput[] = [{role: 'user', content: prompt}];
    let responseId = this.previousResponseId;
    let content = '';

    for (let turnIndex = 0; turnIndex < this.maxTurns; turnIndex += 1) {
      let streamedText = '';
      const turn = await this.model.createTurn({
        instructions,
        input,
        ...(turnIndex === 0 && images.length > 0 ? {images} : {}),
        tools: this.tools,
        ...(responseId === undefined ? {} : {previousResponseId: responseId}),
        signal,
        onTextDelta: (delta) => {
          streamedText += delta;
          content += delta;
          onEvent({type: 'text_delta', content: delta});
        },
      });
      responseId = turn.id;

      if (streamedText.length === 0 && turn.text.length > 0) {
        content += turn.text;
        onEvent({type: 'text_delta', content: turn.text});
      }

      if (turn.toolCalls.length === 0) {
        this.previousResponseId = responseId;
        return content.trim();
      }

      const outputs: AgentInput[] = [];
      for (const call of turn.toolCalls) {
        const tool = this.tools.find((candidate) => candidate.name === call.name);
        if (tool === undefined) {
          outputs.push({
            type: 'function_call_output',
            callId: call.callId,
            output: `Tool không tồn tại: ${call.name}`,
          });
          continue;
        }

        onEvent({type: 'tool_start', toolName: tool.name});
        let output: string;
        try {
          output = await tool.execute(parseArguments(call.arguments), cwd);
        } catch (error: unknown) {
          output = `Lỗi: ${error instanceof Error ? error.message : 'Không xác định'}`;
        }
        onEvent({
          type: 'tool_complete',
          toolName: tool.name,
          summary: summarize(output),
        });
        outputs.push({type: 'function_call_output', callId: call.callId, output});
      }
      input = outputs;
    }

    throw new Error(`Agent đã vượt quá giới hạn ${this.maxTurns} lượt xử lý.`);
  }
}

function parseArguments(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error('Model trả về arguments không phải JSON hợp lệ.');
  }
}

function summarize(value: string): string {
  const firstLine = value.split(/\r?\n/, 1)[0] ?? '';
  return firstLine.length > 100 ? `${firstLine.slice(0, 97)}...` : firstLine;
}
