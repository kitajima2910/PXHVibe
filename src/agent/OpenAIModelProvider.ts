import OpenAI from 'openai';
import type {ResponseInput, FunctionTool} from 'openai/resources/responses/responses';
import type {ModelProvider, ModelRequest} from './ModelProvider.js';
import type {AgentModelTurn} from './types.js';

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
    const input: ResponseInput = request.input.map((item) => {
      if ('type' in item) {
        return {type: 'function_call_output', call_id: item.callId, output: item.output};
      }
      return {role: item.role, content: item.content};
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
