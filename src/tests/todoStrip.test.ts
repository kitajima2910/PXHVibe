import assert from 'node:assert/strict';
import React from 'react';
import {render} from 'ink';
import {PassThrough} from 'node:stream';
import {TodoStrip, todoSymbol, type TodoItem} from '../components/TodoStrip.js';
import {stripAnsi} from '../utils/stripAnsi.js';

assert.equal(todoSymbol('pending'), '○');
assert.equal(todoSymbol('running'), '●');
assert.equal(todoSymbol('pass'), '✓');
assert.equal(todoSymbol('fail'), '✖');
assert.equal(todoSymbol('cancelled'), '■');

const tasks: TodoItem[] = [
  {id: '1', label: 'ANALYZE', status: 'pass'},
  {id: '2', label: 'CODE', status: 'running'},
  {id: '3', label: 'TEST', status: 'pending'},
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
assert.match(visible, /1\/3 hoàn tất/);
assert.match(visible, /✓ ANALYZE/);
assert.match(visible, /● CODE/);
assert.match(visible, /○ TEST/);
assert.match(visible, /MCP/);
assert.match(visible, /Chưa cấu hình/);
instance.unmount();

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
