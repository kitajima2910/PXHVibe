import OpenAI from 'openai';
import type {ResponseInput, FunctionTool} from 'openai/resources/responses/responses';
import type {ModelProvider, ModelRequest} from './ModelProvider.js';
import type {AgentModelTurn} from './types.js';
import {readFile} from 'node:fs/promises';
import {getRateLimiter} from '../utils/rateLimiter.js';

export class OpenAIModelProvider implements ModelProvider {
  private readonly client: OpenAI;
  private readonly rateLimiter = getRateLimiter('openai');

  constructor(
    private readonly model: string,
    apiKey: string,
    baseURL?: string,
  ) {
    this.client = new OpenAI({apiKey, ...(baseURL === undefined ? {} : {baseURL})});
  }

  async createTurn(request: ModelRequest): Promise<AgentModelTurn> {
    const imageContent = await Promise.all((request.images ?? []).map(async (image) => ({
      type: 'input_image' as const,
      detail: 'auto' as const,
      image_url: `data:${image.mimeType};base64,${(await readFile(image.path)).toString('base64')}`,
    })));
    const input: ResponseInput = [];
    for (const item of request.input) {
      if ('type' in item) {
        input.push({type: 'function_call_output', call_id: item.callId, output: item.output});
      } else if (item.role === 'assistant') {
        // Mỗi tool call thành một function_call riêng; nếu thiếu một cái,
        // function_call_output tương ứng sẽ bị API từ chối (400).
        for (const call of item.toolCalls) {
          input.push({
            type: 'function_call',
            call_id: call.callId,
            name: call.name,
            arguments: call.arguments,
          });
        }
      } else {
        input.push({
          role: item.role,
          content: imageContent.length === 0
            ? item.content
            : [{type: 'input_text', text: item.content}, ...imageContent],
        });
      }
    }
    const tools: FunctionTool[] = request.tools.map((tool) => ({
      type: 'function',
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      strict: true,
    }));

    // Use rate limiter for API calls
    const stream = await this.rateLimiter.executeWithLimit(() => 
      Promise.resolve(this.client.responses.stream(
        {
          model: this.model,
          instructions: request.instructions,
          input,
          tools,
        },
        {signal: request.signal},
      ))
    );
    
    stream.on('response.output_text.delta', (event) => {
      request.onTextDelta(event.delta);
    });

    const response = await stream.finalResponse();
    const toolCalls = response.output
      .filter((item) => item.type === 'function_call')
      .map((item) => ({
        callId: item.call_id,
        name: item.name,
        arguments: item.arguments,
      }));

    return {
      id: response.id,
      text: response.output_text,
      toolCalls,
    };
  }
}
