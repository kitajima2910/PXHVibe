import OpenAI from 'openai';
import type {ChatCompletionMessageParam} from 'openai/resources/chat/completions';
import type {ModelProvider, ModelRequest} from './ModelProvider.js';
import type {AgentModelTurn} from './types.js';
import {readFileSync} from 'node:fs';

/**
 * Provider dùng OpenAI Chat Completions API (chuẩn mà DeepSeek, OpenRouter,
 * one-api, LiteLLM... hỗ trợ). Responses API không có trên các endpoint này.
 */
export class ChatCompletionsModelProvider implements ModelProvider {
  private readonly client: OpenAI;

  constructor(
    private readonly model: string,
    apiKey: string,
    baseURL?: string,
  ) {
    this.client = new OpenAI({apiKey, ...(baseURL === undefined ? {} : {baseURL})});
  }

  async createTurn(request: ModelRequest): Promise<AgentModelTurn> {
    const messages: ChatCompletionMessageParam[] = [];
    let imagesAttached = false;
    for (const item of request.input) {
      if ('type' in item) {
        messages.push({role: 'tool', tool_call_id: item.callId, content: item.output});
      } else if (item.role === 'assistant') {
        const toolCalls = item.toolCalls.map((call) => ({
          id: call.callId,
          type: 'function' as const,
          function: {name: call.name, arguments: call.arguments || '{}'},
        }));
        messages.push({
          role: 'assistant',
          content: item.text ?? '',
          ...(toolCalls.length > 0 ? {tool_calls: toolCalls} : {}),
        });
      } else {
        const text = item.content;
        const images = (!imagesAttached) ? (request.images ?? []) : [];
        imagesAttached = true;
        const content = images.length === 0
          ? text
          : [
            {type: 'text' as const, text},
            ...images.map((image) => ({
              type: 'image_url' as const,
              image_url: {
                url: `data:${image.mimeType};base64,${readFileSync(image.path).toString('base64')}`,
              },
            })),
          ];
        messages.push({role: 'user', content});
      }
    }

    const tools = request.tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));

    const stream = await this.client.chat.completions.create(
      {
        model: this.model,
        messages: [
          {role: 'system', content: request.instructions},
          ...messages,
        ],
        ...(tools.length > 0 ? {tools} : {}),
        stream: true,
      },
      {signal: request.signal},
    );

    let text = '';
    const toolCalls: Map<number, {callId: string; name: string; arguments: string}> = new Map();
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta === undefined) continue;
      if (delta.content !== null && delta.content !== undefined) {
        text += delta.content;
        request.onTextDelta(delta.content);
      }
      if (delta.tool_calls !== undefined) {
        for (const call of delta.tool_calls) {
          const index = call.index;
          const existing = toolCalls.get(index) ?? {callId: `call_${index}`, name: '', arguments: ''};
          if (call.id !== undefined && call.id !== null) existing.callId = call.id;
          if (call.function?.name !== undefined && call.function.name !== null) {
            existing.name += call.function.name;
          }
          if (call.function?.arguments !== undefined && call.function.arguments !== null) {
            existing.arguments += call.function.arguments;
          }
          toolCalls.set(index, existing);
        }
      }
    }

    return {
      id: `chat-${Date.now()}`,
      text,
      toolCalls: [...toolCalls.values()],
    };
  }
}
