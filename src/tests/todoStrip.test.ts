import assert from 'node:assert/strict';
import React from 'react';
import {render} from 'ink';
import {PassThrough} from 'node:stream';
import {mcpConnectedColor, mcpServerColor, TodoStrip} from '../components/TodoStrip.js';
import {stripAnsi} from '../utils/stripAnsi.js';

assert.equal(mcpConnectedColor, '#3fb950');
assert.equal(mcpServerColor('connected'), '#3fb950');
assert.equal(mcpServerColor('error'), 'red');
assert.equal(mcpServerColor('connecting'), 'gray');

const mcpOutput = new PassThrough();
Object.assign(mcpOutput, {columns: 60, rows: 12, isTTY: true});
let mcpFrame = '';
mcpOutput.on('data', (chunk) => { mcpFrame += chunk.toString('utf8'); });
const mcpInstance = render(React.createElement(TodoStrip, {
  mcpServers: [{name: 'filesystem', state: 'connected', toolCount: 4}],
}), {stdout: mcpOutput as unknown as NodeJS.WriteStream, debug: true});
await new Promise((resolve) => setTimeout(resolve, 30));
assert.match(stripAnsi(mcpFrame), /MCP/);
assert.match(stripAnsi(mcpFrame), /● filesystem · CONNECTED · 4 tools/);
mcpInstance.unmount();

const emptyOutput = new PassThrough();
Object.assign(emptyOutput, {columns: 24, rows: 12, isTTY: true});
let emptyFrame = '';
emptyOutput.on('data', (chunk) => { emptyFrame += chunk.toString('utf8'); });
const emptyInstance = render(React.createElement(TodoStrip, {}), {
  stdout: emptyOutput as unknown as NodeJS.WriteStream,
  debug: true,
});
await new Promise((resolve) => setTimeout(resolve, 30));
assert.match(stripAnsi(emptyFrame), /MCP/);
assert.match(stripAnsi(emptyFrame), /Chưa cấu hình/);
emptyInstance.unmount();

console.log('Sticky todo tests passed.');
