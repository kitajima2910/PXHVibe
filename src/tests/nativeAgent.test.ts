import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {AgentRuntime} from '../agent/AgentRuntime.js';
import type {ModelProvider, ModelRequest} from '../agent/ModelProvider.js';
import type {AgentModelTurn} from '../agent/types.js';
import {createWorkspaceTools} from '../agent/tools/workspaceTools.js';

class FakeModelProvider implements ModelProvider {
  readonly requests: ModelRequest[] = [];

  async createTurn(request: ModelRequest) {
    this.requests.push(request);
    if (this.requests.length === 1) {
      return {
        id: 'response-1',
        text: '',
        toolCalls: [{callId: 'call-1', name: 'read_file', arguments: '{"path":"hello.txt"}'}],
      };
    }
    request.onTextDelta('Đã đọc file.');
    return {id: 'response-2', text: 'Đã đọc file.', toolCalls: []};
  }
}

// Model luôn trả về tool call giống hệt nhau → mô phỏng agent bị lặp.
class LoopModelProvider implements ModelProvider {
  async createTurn(): Promise<AgentModelTurn> {
    return {
      id: 'loop',
      text: '',
      toolCalls: [{callId: 'call-loop', name: 'list_files', arguments: '{"path":"."}'}],
    };
  }
}

const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'pxhvibe-native-'));
try {
  await writeFile(path.join(temporaryDirectory, 'hello.txt'), 'xin chào', 'utf8');
  const tools = createWorkspaceTools();
  const model = new FakeModelProvider();
  const events: string[] = [];
  const runtime = new AgentRuntime(model, tools);
  const response = await runtime.run(
    'Đọc hello.txt',
    temporaryDirectory,
    new AbortController().signal,
    (event) => events.push(event.type),
  );

  assert.equal(response, 'Đã đọc file.');
  assert.equal(model.requests.length, 2);
  const firstInput = model.requests[1]?.input[1];
  assert.ok(firstInput !== undefined && 'role' in firstInput && firstInput.role === 'assistant');
  const secondInput = model.requests[1]?.input[2];
  assert.ok(secondInput !== undefined && 'type' in secondInput);
  assert.match(secondInput.output, /xin chào/);
  assert.deepEqual(events, ['tool_start', 'tool_complete', 'text_delta']);

  // Agent bị lặp tool call phải dừng sớm thay vì chạy hết 12 lượt.
  const loopRuntime = new AgentRuntime(new LoopModelProvider(), tools);
  await assert.rejects(
    loopRuntime.run('Liệt kê file', temporaryDirectory, new AbortController().signal, () => undefined),
    /lặp tool call/,
  );

  const patchTool = tools.find((tool) => tool.name === 'apply_patch');
  assert.ok(patchTool !== undefined);
  await patchTool.execute(
    {path: 'hello.txt', old_text: 'xin chào', new_text: 'chào PXHVibe'},
    temporaryDirectory,
  );
  assert.equal(await readFile(path.join(temporaryDirectory, 'hello.txt'), 'utf8'), 'chào PXHVibe');
  await patchTool.execute(
    {path: 'src/nested/new.txt', old_text: '', new_text: 'new file'},
    temporaryDirectory,
  );
  assert.equal(
    await readFile(path.join(temporaryDirectory, 'src/nested/new.txt'), 'utf8'),
    'new file',
  );
  await assert.rejects(
    patchTool.execute(
      {path: '../outside.txt', old_text: '', new_text: 'blocked'},
      temporaryDirectory,
    ),
    /ngoài workspace/,
  );
  console.log('Native agent tests: passed');
} finally {
  await rm(temporaryDirectory, {recursive: true, force: true});
}
