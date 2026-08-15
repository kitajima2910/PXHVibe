import type {ModelProvider, ModelRequest} from './ModelProvider.js';
import type {AgentModelTurn} from './types.js';
import {readFile} from 'node:fs/promises';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: unknown[];
}

export class AnthropicModelProvider implements ModelProvider {
  private readonly baseURL: string;
  private messages: AnthropicMessage[] = [];
  private systemInstruction: string | undefined;

  constructor(
    private readonly model: string,
    private readonly apiKey: string,
    baseURL?: string,
  ) {
    this.baseURL = (baseURL ?? 'https://api.anthropic.com').replace(/\/$/, '');
  }

  async createTurn(request: ModelRequest): Promise<AgentModelTurn> {
    if (request.previousResponseId === undefined) {
      this.messages = [];
      this.systemInstruction = request.instructions;
    }

    const imageContent = await Promise.all((request.images ?? []).map(async (image) => ({
      type: 'image',
      source: {
        type: 'base64',
        media_type: image.mimeType,
        data: (await readFile(image.path)).toString('base64'),
      },
    })));

    for (const item of request.input) {
      if ('type' in item) {
        this.messages.push({
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: item.callId,
            content: item.output,
          }],
        });
      } else {
        this.messages.push({
          role: 'user',
          content: imageContent.length === 0
            ? [{type: 'text', text: item.content}]
            : [{type: 'text', text: item.content}, ...imageContent],
        });
      }
    }

    const tools = request.tools.map((tool) => ({
      type: 'custom',
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    }));

    const response = await fetch(`${this.baseURL}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-10-16',
        'content-type': 'application/json',
        accept: 'text/event-stream',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        ...(this.systemInstruction ? {system: this.systemInstruction} : {}),
        messages: this.messages,
        ...(tools.length > 0 ? {tools} : {}),
        stream: true,
      }),
      signal: request.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Anthropic API lỗi ${response.status}: ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (reader === undefined) {
      throw new Error('Anthropic API không trả về response body.');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let responseId = '';
    let text = '';
    const toolCalls: {callId: string; name: string; arguments: string}[] = [];
    let currentToolUse: {id: string; name: string; input: string} | undefined;

    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, {stream: true});

      let eventEnd: number;
      while ((eventEnd = buffer.indexOf('\n\n')) !== -1) {
        const eventText = buffer.slice(0, eventEnd);
        buffer = buffer.slice(eventEnd + 2);
        this.parseAnthropicEvent(eventText, {
          setResponseId: (id) => { responseId = id; },
          onTextDelta: (delta) => {
            text += delta;
            request.onTextDelta(delta);
          },
          startToolUse: (id, name) => {
            currentToolUse = {id, name, input: ''};
          },
          toolInputDelta: (partialJson) => {
            if (currentToolUse) currentToolUse.input += partialJson;
          },
          endToolUse: () => {
            if (currentToolUse) {
              toolCalls.push({
                callId: currentToolUse.id,
                name: currentToolUse.name,
                arguments: currentToolUse.input,
              });
              currentToolUse = undefined;
            }
          },
        });
      }
    }

    const remaining = buffer.trim();
    if (remaining.length > 0) {
      this.parseAnthropicEvent(remaining, {
        setResponseId: (id) => { responseId = id; },
        onTextDelta: (delta) => {
          text += delta;
          request.onTextDelta(delta);
        },
        startToolUse: (id, name) => {
          currentToolUse = {id, name, input: ''};
        },
        toolInputDelta: (partialJson) => {
          if (currentToolUse) currentToolUse.input += partialJson;
        },
        endToolUse: () => {
          if (currentToolUse) {
            toolCalls.push({
              callId: currentToolUse.id,
              name: currentToolUse.name,
              arguments: currentToolUse.input,
            });
            currentToolUse = undefined;
          }
        },
      });
    }

    const assistantMessage: AnthropicMessage = {
      role: 'assistant',
      content: [],
    };
    if (text.length > 0) {
      assistantMessage.content.push({type: 'text', text});
    }
    for (const call of toolCalls) {
      assistantMessage.content.push({
        type: 'tool_use',
        id: call.callId,
        name: call.name,
        input: JSON.parse(call.arguments || '{}'),
      });
    }
    if (assistantMessage.content.length > 0) {
      this.messages.push(assistantMessage);
    }

    return {
      id: responseId || `anthropic-${Date.now()}`,
      text,
      toolCalls,
    };
  }

  private parseAnthropicEvent(
    eventText: string,
    callbacks: {
      setResponseId: (id: string) => void;
      onTextDelta: (delta: string) => void;
      startToolUse: (id: string, name: string) => void;
      toolInputDelta: (partialJson: string) => void;
      endToolUse: () => void;
    },
  ): void {
    let eventType = '';
    let dataLine = '';
    for (const line of eventText.split('\n')) {
      if (line.startsWith('event: ')) {
        eventType = line.slice('event: '.length);
      } else if (line.startsWith('data: ')) {
        dataLine = line.slice('data: '.length);
      }
    }
    if (dataLine.length === 0) return;

    const payload = JSON.parse(dataLine);
    if (eventType === 'message_start' || payload.type === 'message_start') {
      if (payload.message?.id) callbacks.setResponseId(payload.message.id);
    } else if (payload.type === 'content_block_start') {
      if (payload.content_block?.type === 'tool_use') {
        callbacks.startToolUse(payload.content_block.id, payload.content_block.name);
      }
    } else if (payload.type === 'content_block_delta') {
      if (payload.delta?.type === 'text_delta' && payload.delta.text) {
        callbacks.onTextDelta(payload.delta.text);
      } else if (payload.delta?.type === 'input_json_delta' && payload.delta.partial_json) {
        callbacks.toolInputDelta(payload.delta.partial_json);
      }
    } else if (payload.type === 'content_block_stop') {
      callbacks.endToolUse();
    }
  }
}
