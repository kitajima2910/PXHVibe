import assert from 'node:assert/strict';
import React from 'react';
import {render} from 'ink';
import {PassThrough} from 'node:stream';
import {
  compactTodoDetail, phaseTodoLabel, TodoStrip, todoSymbol, type TodoItem,
} from '../components/TodoStrip.js';
import {stripAnsi} from '../utils/stripAnsi.js';

assert.equal(todoSymbol('pending'), '○');
assert.equal(todoSymbol('running'), '●');
assert.equal(todoSymbol('pass'), '✓');
assert.equal(todoSymbol('fail'), '✖');
assert.equal(todoSymbol('cancelled'), '■');
assert.equal(phaseTodoLabel('code', 'game'), 'Xây dựng gameplay');
assert.equal(phaseTodoLabel('code', 'web'), 'Triển khai giao diện');
assert.equal(phaseTodoLabel('test', 'game'), 'Chạy kiểm thử');
assert.equal(compactTodoDetail('  Đang   đọc\nfile...  '), 'Đang đọc file...');
assert.equal(compactTodoDetail('123456789', 6), '12345…');

const tasks: TodoItem[] = [
  {id: '1', label: 'Phân tích yêu cầu', status: 'pass', agentLabel: 'PXH PM (Auto)', attempt: 1},
  {id: '2', label: 'Xây dựng gameplay', status: 'running', agentLabel: 'PXH Expert', attempt: 2, detail: 'Đang đọc file index.html...'},
  {id: '3', label: 'Chạy kiểm thử', status: 'pending', agentLabel: 'PXH QA'},
];
const output = new PassThrough();
Object.assign(output, {columns: 80, rows: 20, isTTY: true});
let frame = '';
output.on('data', (chunk) => { frame += chunk.toString('utf8'); });
const instance = render(React.createElement(TodoStrip, {tasks}), {
  stdout: output as unknown as NodeJS.WriteStream,
  debug: true,
});
await new Promise((resolve) => setTimeout(resolve, 30));
const visible = stripAnsi(frame);
assert.match(visible, /TASKS/);
assert.match(visible, /1\/3 ✓/);
assert.match(visible, /✓ Phân tích yêu cầu/);
assert.match(visible, /● Xây dựng gameplay/);
assert.match(visible, /PXH Expert · lần 2/);
assert.match(visible, /Đang đọc file index\.html/);
assert.match(visible, /○ Chạy kiểm thử/);
assert.match(visible, /PXH QA/);
assert.match(visible, /MCP/);
assert.match(visible, /Chưa cấu hình/);
instance.unmount();

const mcpOutput = new PassThrough();
Object.assign(mcpOutput, {columns: 60, rows: 12, isTTY: true});
let mcpFrame = '';
mcpOutput.on('data', (chunk) => { mcpFrame += chunk.toString('utf8'); });
const mcpInstance = render(React.createElement(TodoStrip, {
  tasks: [], mcpServers: [{name: 'filesystem', state: 'connected', toolCount: 4}],
}), {stdout: mcpOutput as unknown as NodeJS.WriteStream, debug: true});
await new Promise((resolve) => setTimeout(resolve, 30));
assert.match(stripAnsi(mcpFrame), /● filesystem · 4/);
mcpInstance.unmount();

const emptyOutput = new PassThrough();
Object.assign(emptyOutput, {columns: 24, rows: 12, isTTY: true});
let emptyFrame = '';
emptyOutput.on('data', (chunk) => { emptyFrame += chunk.toString('utf8'); });
const emptyInstance = render(React.createElement(TodoStrip, {tasks: []}), {
  stdout: emptyOutput as unknown as NodeJS.WriteStream,
  debug: true,
});
await new Promise((resolve) => setTimeout(resolve, 30));
assert.match(stripAnsi(emptyFrame), /Chưa có pipeline/);
emptyInstance.unmount();

console.log('Sticky todo tests passed.');
