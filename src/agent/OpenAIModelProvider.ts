import OpenAI from 'openai';
import type {ResponseInput, FunctionTool} from 'openai/resources/responses/responses';
import type {ModelProvider, ModelRequest} from './ModelProvider.js';
import type {AgentModelTurn} from './types.js';
import {readFile} from 'node:fs/promises';

export class OpenAIModelProvider implements ModelProvider {
  private readonly client: OpenAI;

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
    const input: ResponseInput = request.input.map((item) => {
      if ('type' in item) {
        return {type: 'function_call_output', call_id: item.callId, output: item.output};
      }
      return {
        role: item.role,
        content: imageContent.length === 0
          ? item.content
          : [{type: 'input_text', text: item.content}, ...imageContent],
      };
    });
    const tools: FunctionTool[] = request.tools.map((tool) => ({
      type: 'function',
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      strict: true,
    }));

    const stream = this.client.responses.stream(
      {
        model: this.model,
        instructions: request.instructions,
        input,
        tools,
        store: true,
        ...(request.previousResponseId === undefined
          ? {}
          : {previous_response_id: request.previousResponseId}),
      },
      {signal: request.signal},
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
