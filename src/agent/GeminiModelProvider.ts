import type {ModelProvider, ModelRequest} from './ModelProvider.js';
import type {AgentModelTurn} from './types.js';
import {readFile} from 'node:fs/promises';

interface GeminiContent {
  role: 'user' | 'model';
  parts: unknown[];
}

export class GeminiModelProvider implements ModelProvider {
  private readonly baseURL: string;
  private messages: GeminiContent[] = [];
  private systemInstruction: string | undefined;
  private callIdCounter = 0;
  private callIdMap: Map<string, string> = new Map();

  constructor(
    private readonly model: string,
    private readonly apiKey: string,
    baseURL?: string,
  ) {
    this.baseURL = (baseURL ?? 'https://generativelanguage.googleapis.com').replace(/\/$/, '');
  }

  async createTurn(request: ModelRequest): Promise<AgentModelTurn> {
    this.messages = [];
    this.systemInstruction = request.instructions;
    this.callIdCounter = 0;
    this.callIdMap = new Map();

    const imageContent = await Promise.all((request.images ?? []).map(async (image) => ({
      inlineData: {
        mimeType: image.mimeType,
        data: (await readFile(image.path)).toString('base64'),
      },
    })));

    for (const item of request.input) {
      if ('type' in item) {
        // Gộp toàn bộ functionResponse của cùng một lượt assistant vào một
        // content user duy nhất để không vi phạm alternation.
        const toolName = this.callIdMap.get(item.callId) ?? '';
        this.callIdMap.delete(item.callId);
        const last = this.messages[this.messages.length - 1];
        if (last !== undefined && last.role === 'user' && hasFunctionResponses(last.parts)) {
          last.parts.push({
            functionResponse: {
              name: toolName,
              response: {response: item.output},
            },
          });
        } else {
          this.messages.push({
            role: 'user',
            parts: [{
              functionResponse: {
                name: toolName,
                response: {response: item.output},
              },
            }],
          });
        }
      } else if (item.role === 'assistant') {
        const parts: unknown[] = [];
        if (item.text !== undefined && item.text.length > 0) {
          parts.push({text: item.text});
        }
        for (const call of item.toolCalls) {
          this.callIdMap.set(call.callId, call.name);
          parts.push({
            functionCall: {
              name: call.name,
              args: parseJsonObject(call.arguments),
            },
          });
        }
        this.messages.push({role: 'model', parts});
      } else {
        this.messages.push({
          role: 'user',
          parts: imageContent.length === 0
            ? [{text: item.content}]
            : [{text: item.content}, ...imageContent],
        });
      }
    }

    const tools = request.tools.length > 0
      ? [{function_declarations: request.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        }))}]
      : [];

    const response = await fetch(
      `${this.baseURL}/v1beta/models/${encodeURIComponent(this.model)}:streamGenerateContent?alt=sse`,
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': this.apiKey,
          'content-type': 'application/json',
          accept: 'text/event-stream',
        },
        body: JSON.stringify({
          ...(this.systemInstruction
            ? {systemInstruction: {parts: [{text: this.systemInstruction}], role: 'user'}}
            : {}),
           contents: this.messages,
           ...(tools.length > 0 ? {tools} : {}),
           generationConfig: {maxOutputTokens: 4096},
        }),
        signal: request.signal,
      },
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Gemini API lỗi ${response.status}: ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (reader === undefined) {
      throw new Error('Gemini API không trả về response body.');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let responseId = '';
    let text = '';
    const toolCalls: {callId: string; name: string; arguments: string}[] = [];
    const currentFunctionCalls: {callId: string; name: string; args: Record<string, unknown>}[] = [];

    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, {stream: true});

      let lineEnd: number;
      while ((lineEnd = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, lineEnd).trim();
        buffer = buffer.slice(lineEnd + 1);

        if (line.startsWith('data: ')) {
          const jsonData = line.slice('data: '.length);
          if (jsonData === '[DONE]') continue;
          const chunks = JSON.parse(jsonData);
          for (const chunk of chunks) {
            if (responseId === '' && chunk.responseId) {
              responseId = chunk.responseId;
            }
            for (const candidate of chunk.candidates ?? []) {
              const content = candidate.content;
              if (content?.role === 'model') {
                for (const part of content.parts ?? []) {
                  if (typeof part === 'object' && part !== null) {
                    if ('text' in part && part.text) {
                      text += part.text;
                      request.onTextDelta(part.text);
                    }
                    if ('functionCall' in part && part.functionCall) {
                      const fc = part.functionCall as {name: string; args?: Record<string, unknown>};
                      const callId = `call_${this.callIdCounter++}`;
                      this.callIdMap.set(callId, fc.name);
                      const call = {callId, name: fc.name, args: fc.args ?? {}};
                      currentFunctionCalls.push(call);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    const remaining = buffer.trim();
    if (remaining.length > 0 && remaining.startsWith('data: ')) {
      const jsonData = remaining.slice('data: '.length);
      if (jsonData !== '[DONE]') {
        const chunks = JSON.parse(jsonData);
        for (const chunk of chunks) {
          for (const candidate of chunk.candidates ?? []) {
            const content = candidate.content;
            if (content?.role === 'model') {
              for (const part of content.parts ?? []) {
                if (typeof part === 'object' && part !== null && 'functionCall' in part) {
                  const fc = part.functionCall as {name: string; args?: Record<string, unknown>};
                  const callId = `call_${this.callIdCounter++}`;
                  this.callIdMap.set(callId, fc.name);
                  currentFunctionCalls.push({callId, name: fc.name, args: fc.args ?? {}});
                }
              }
            }
          }
        }
      }
    }

    for (const call of currentFunctionCalls) {
      toolCalls.push({
        callId: call.callId,
        name: call.name,
        arguments: JSON.stringify(call.args),
      });
    }

    return {
      id: responseId || `gemini-${Date.now()}`,
      text,
      toolCalls,
    };
  }
}

function hasFunctionResponses(parts: unknown[]): boolean {
  return parts.some((part) => typeof part === 'object' && part !== null
    && 'functionResponse' in part);
}

function parseJsonObject(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value || '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}
