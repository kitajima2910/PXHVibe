import assert from 'node:assert/strict';
import {createServer, type Server} from 'node:http';
import type {AddressInfo} from 'node:net';
import {ChatCompletionsModelProvider} from '../agent/ChatCompletionsModelProvider.js';
import type {ModelRequest} from '../agent/ModelProvider.js';

// Mock server trả SSE streaming cho POST /chat/completions.
const server: Server = createServer((request, response) => {
  let body = '';
  request.on('data', (chunk) => { body += chunk.toString('utf8'); });
  request.on('end', () => {
    const payload = JSON.parse(body) as {messages: Array<{role: string}>; tools?: unknown[]};
    response.writeHead(200, {'content-type': 'text/event-stream', 'cache-control': 'no-cache'});
    const hasTools = Array.isArray(payload.tools) && payload.tools.length > 0;
    const messageRoles = payload.messages.map((message) => message.role).join(',');
    if (hasTools) {
      // Trả về 2 tool calls trong cùng lượt.
      const chunk = JSON.stringify({choices: [{delta: {tool_calls: [
        {index: 0, id: 'call_1', function: {name: 'read_file', arguments: '{"path":"a.txt"}'}},
        {index: 1, id: 'call_2', function: {name: 'list_files', arguments: '{}'}},
      ]}}]});
      response.write(`data: ${chunk}\n\n`);
    } else {
      const chunk = JSON.stringify({choices: [{delta: {content: 'Xong'}}]});
      response.write(`data: ${chunk}\n\n`);
    }
    response.write('data: [DONE]\n\n');
    response.end();
    // Ghi lại thông tin để assert sau.
    (globalThis as Record<string, unknown>).__lastChatPayload = {payload, messageRoles};
  });
});

await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address() as AddressInfo;
const baseURL = `http://127.0.0.1:${address.port}`;

try {
  const provider = new ChatCompletionsModelProvider('test-model', 'key', baseURL);
  const tools = [
    {name: 'read_file', description: 'Đọc file', parameters: {type: 'object', properties: {path: {type: 'string'}}}},
    {name: 'list_files', description: 'Liệt kê file', parameters: {type: 'object'}},
  ];
  const request: ModelRequest = {
    instructions: 'Bạn là agent.',
    input: [
      {role: 'user', content: 'Đọc file a.txt'},
      {
        role: 'assistant',
        toolCalls: [
          {callId: 'call_1', name: 'read_file', arguments: '{"path":"a.txt"}'},
          {callId: 'call_2', name: 'list_files', arguments: '{}'},
        ],
      },
      {type: 'function_call_output', callId: 'call_1', output: 'nội dung a'},
      {type: 'function_call_output', callId: 'call_2', output: '[]'},
    ],
    tools,
    signal: new AbortController().signal,
    onTextDelta: () => undefined,
  };
  const turn = await provider.createTurn(request);

  // Turn 1: có tool calls → trả 2 tool calls.
  assert.equal(turn.toolCalls.length, 2);
  assert.equal(turn.toolCalls[0]?.callId, 'call_1');
  assert.equal(turn.toolCalls[1]?.name, 'list_files');

  // Verify payload gửi đi: system + user + assistant (tool_calls) + 2 tool.
  const recorded = (globalThis as Record<string, unknown>).__lastChatPayload as {
    payload: {messages: Array<{role: string; tool_calls?: unknown}>};
    messageRoles: string;
  };
  assert.equal(recorded.messageRoles, 'system,user,assistant,tool,tool');
  assert.equal(recorded.payload.messages[0]?.role, 'system');
  assert.equal(recorded.payload.messages[2]?.role, 'assistant');
  assert.ok((recorded.payload.messages[2] as {tool_calls?: unknown}).tool_calls !== undefined);

  // Turn 2: không tools → text.
  const request2: ModelRequest = {
    instructions: 'Bạn là agent.',
    input: [{role: 'user', content: 'Tóm tắt'}],
    tools: [],
    signal: new AbortController().signal,
    onTextDelta: () => undefined,
  };
  const turn2 = await provider.createTurn(request2);
  assert.equal(turn2.text, 'Xong');
  assert.equal(turn2.toolCalls.length, 0);
} finally {
  server.close();
}

console.log('Chat Completions provider tests: passed');
