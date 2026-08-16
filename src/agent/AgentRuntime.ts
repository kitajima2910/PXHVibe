import type {ModelProvider} from './ModelProvider.js';
import type {AgentEvent, AgentImage, AgentInput, AgentTool} from './types.js';

const instructions = `You are PXHVibe, a coding agent working in the user's current project.
Use the available tools to inspect and edit the project before answering.
Never claim a file was changed unless a tool result confirms it.
Keep changes minimal and stay inside the workspace.
There is no shell tool. If verification requires a command, explain that limitation.
Trả lời ngay sau khi hoàn thành; không gọi lại tool call giống hệt lần trước và không lặp vòng tool.

OUTPUT FORMAT:
- Answer in structured Markdown that is easy to scan in a terminal.
- Start with a 1-2 line summary of what was done.
- Use bullet lists, short headings, and code fences for commands, paths, diffs, or code.
- Always include a "File đã sửa" section listing each changed path (relative to the working directory).
- Include a "Kết quả kiểm tra" section with the commands run and whether they passed.
- Include a "Vấn đề còn lại" section if there are limitations or unfinished work.
- Keep every line under 100 characters; avoid wide tables, emoji, or HTML-style markup.`;

export class AgentRuntime {
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
    const history: AgentInput[] = [{role: 'user', content: prompt}];
    let content = '';
    const seenCalls = new Map<string, number>();

    for (let turnIndex = 0; turnIndex < this.maxTurns; turnIndex += 1) {
      let streamedText = '';
      const turn = await this.model.createTurn({
        instructions,
        input: history,
        ...(turnIndex === 0 && images.length > 0 ? {images} : {}),
        tools: this.tools,
        signal,
        onTextDelta: (delta) => {
          streamedText += delta;
          content += delta;
          onEvent({type: 'text_delta', content: delta});
        },
      });

      if (streamedText.length === 0 && turn.text.length > 0) {
        content += turn.text;
        onEvent({type: 'text_delta', content: turn.text});
      }

      if (turn.toolCalls.length === 0) {
        return content.trim();
      }

      const callsKey = turn.toolCalls
        .map((call) => `${call.name}(${call.arguments})`)
        .sort()
        .join('|');
      const repeatCount = (seenCalls.get(callsKey) ?? 0) + 1;
      seenCalls.set(callsKey, repeatCount);
      if (repeatCount >= 3) {
        throw new Error('Agent bị lặp tool call. Dừng sớm để tránh tốn lượt.');
      }

      // Giữ assistant turn (tool calls) trong history để provider nối đúng
      // function_call → function_call_output.
      history.push({
        role: 'assistant',
        toolCalls: turn.toolCalls,
        ...(turn.text.length === 0 ? {} : {text: turn.text}),
      });

      for (const call of turn.toolCalls) {
        const tool = this.tools.find((candidate) => candidate.name === call.name);
        if (tool === undefined) {
          history.push({
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
        history.push({type: 'function_call_output', callId: call.callId, output});
      }
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
