import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {CallToolRequestSchema, ListToolsRequestSchema} from '@modelcontextprotocol/sdk/types.js';
import {
  formatMCPStatus, loadMCPConfig, MCPManager, toOpenCodeMCPConfig,
} from '../mcp/MCPManager.js';
import {buildOpenCodeEnvironment} from '../providers/OpenCodeProvider.js';

if (process.argv.includes('--mcp-fixture-server')) {
  const server = new Server({name: 'pxhvibe-test', version: '1.0.0'}, {capabilities: {tools: {}}});
  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: [{
      name: 'echo', description: 'Echo a value',
      inputSchema: {type: 'object', properties: {value: {type: 'string'}}, required: ['value']},
    }],
  }));
  server.setRequestHandler(CallToolRequestSchema, (request) => ({
    content: [{type: 'text', text: `echo:${String(request.params.arguments?.value ?? '')}`}],
  }));
  await server.connect(new StdioServerTransport());
} else {
  const workspace = mkdtempSync(path.join(tmpdir(), 'pxhvibe-mcp-'));
  const configDirectory = path.join(workspace, '.pxhvibe');
  mkdirSync(configDirectory);
  writeFileSync(path.join(configDirectory, 'mcp.json'), JSON.stringify({
    servers: {
      fixture: {
        type: 'local',
        command: [process.execPath, fileURLToPath(import.meta.url), '--mcp-fixture-server'],
        environment: {PXH_TEST_SECRET: '{env:PXH_TEST_SECRET}'},
      },
      disabled: {type: 'remote', url: 'https://example.com/mcp', disabled: true},
    },
  }), 'utf8');

  process.env.PXH_TEST_SECRET = 'available';
  const config = loadMCPConfig(workspace);
  assert.deepEqual(Object.keys(config.servers), ['fixture', 'disabled']);
  const openCodeConfig = toOpenCodeMCPConfig(config);
  assert.equal((openCodeConfig.disabled as {enabled: boolean}).enabled, false);
  const openCodeEnvironment = buildOpenCodeEnvironment(workspace, {
    PATH: process.env.PATH,
    OPENCODE_CONFIG_CONTENT: JSON.stringify({theme: 'dark', mcp: {existing: {type: 'remote', url: 'https://old.invalid'}}}),
  });
  const bridged = JSON.parse(openCodeEnvironment.OPENCODE_CONFIG_CONTENT ?? '{}') as {
    theme?: string; mcp?: Record<string, unknown>;
  };
  assert.equal(bridged.theme, 'dark');
  assert.ok(bridged.mcp?.existing);
  assert.ok(bridged.mcp?.fixture);

  const manager = new MCPManager(workspace);
  assert.deepEqual(manager.load().map((status) => status.state), ['configured', 'disabled']);
  const statuses = await manager.refresh();
  assert.deepEqual(statuses.map((status) => status.state), ['connected', 'disabled']);
  assert.equal(statuses[0]?.toolCount, 1);
  assert.match(formatMCPStatus(statuses), /fixture · connected · 1 tools/);
  const tool = manager.tools[0];
  assert.ok(tool?.name.startsWith('mcp_fixture_echo'));
  assert.equal(await tool?.execute({value: 'xin chào'}, workspace), 'echo:xin chào');
  await manager.close();

  writeFileSync(path.join(configDirectory, 'mcp.json'), '{broken', 'utf8');
  assert.throws(() => loadMCPConfig(workspace), /MCP config không hợp lệ/);
  rmSync(workspace, {recursive: true, force: true});
  console.log('MCP manager tests: passed');
}
