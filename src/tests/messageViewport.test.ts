import assert from 'node:assert/strict';
import React from 'react';
import {Box, render} from 'ink';
import {PassThrough} from 'node:stream';
import {MessageList} from '../components/MessageList.js';
import {buildScrollbar, scrollbarWidth} from '../components/MessageList.js';
import type {Message} from '../types/message.js';
import {stripAnsi} from '../utils/stripAnsi.js';
import {parseTerminalMouse} from '../utils/mouse.js';

assert.deepEqual(parseTerminalMouse('[<64;10;5M'), {
  button: 'wheel-up', action: 'press', x: 9, y: 4,
});
assert.equal(scrollbarWidth, 4);
assert.deepEqual(buildScrollbar(5, 10, 0), ['┊', '┊', '┊', '┃', '┃']);
assert.deepEqual(buildScrollbar(5, 10, 9), ['┃', '┃', '┊', '┊', '┊']);
assert.equal(buildScrollbar(20, 2, 0).filter((cell) => cell === '┃').length, 5);
assert.deepEqual(buildScrollbar(3, 1, 0), ['┊', '┊', '┊']);

const messages: Message[] = Array.from({length: 10}, (_, index) => ({
  id: String(index),
  role: index % 2 === 0 ? 'user' : 'assistant',
  content: `message-${index}`,
  createdAt: new Date(2026, 0, 1, 12, index),
}));
const input = new PassThrough();
Object.assign(input, {isTTY: true, setRawMode: () => input, ref: () => input, unref: () => input});
const output = new PassThrough();
Object.assign(output, {columns: 80, rows: 12, isTTY: true});
let frame = '';
output.on('data', (chunk) => { frame += chunk.toString('utf8'); });

const instance = render(
  React.createElement(Box, {height: 8}, React.createElement(MessageList, {messages})),
  {
    stdin: input as unknown as NodeJS.ReadStream,
    stdout: output as unknown as NodeJS.WriteStream,
    stderr: output as unknown as NodeJS.WriteStream,
    debug: true,
    exitOnCtrlC: false,
  },
);
await new Promise((resolve) => setTimeout(resolve, 40));
const visible = stripAnsi(frame);
assert.match(visible, /message-9/);

frame = '';
input.write('\x1b[5~');
await new Promise((resolve) => setTimeout(resolve, 40));
const historyFrame = stripAnsi(frame);
assert.match(historyFrame, /HISTORY/);
assert.match(historyFrame, /message-[0-8]/);
assert.doesNotMatch(historyFrame, /message-9/);

frame = '';
input.write('\x1b[6~');
await new Promise((resolve) => setTimeout(resolve, 40));
const newestFrame = stripAnsi(frame);
assert.match(newestFrame, /message-9/);
assert.doesNotMatch(newestFrame, /HISTORY/);
instance.unmount();

const layoutOutput = new PassThrough();
Object.assign(layoutOutput, {columns: 80, rows: 20, isTTY: true});
let layoutFrame = '';
layoutOutput.on('data', (chunk) => { layoutFrame += chunk.toString('utf8'); });
const layout = render(
  React.createElement(Box, {height: 12}, React.createElement(MessageList, {messages: messages.slice(0, 2)})),
  {
    stdin: input as unknown as NodeJS.ReadStream,
    stdout: layoutOutput as unknown as NodeJS.WriteStream,
    stderr: layoutOutput as unknown as NodeJS.WriteStream,
    debug: true,
    exitOnCtrlC: false,
  },
);
await new Promise((resolve) => setTimeout(resolve, 40));
const openCodeStyleFrame = stripAnsi(layoutFrame);
assert.match(openCodeStyleFrame, /› message-0/);
assert.match(openCodeStyleFrame, /◆ PXHVibe/);
assert.doesNotMatch(openCodeStyleFrame, /YOU|target|response|12:0/);
layout.unmount();

const longInput = new PassThrough();
Object.assign(longInput, {isTTY: true, setRawMode: () => longInput, ref: () => longInput, unref: () => longInput});
const longOutput = new PassThrough();
Object.assign(longOutput, {columns: 80, rows: 10, isTTY: true});
let longFrame = '';
longOutput.on('data', (chunk) => { longFrame += chunk.toString('utf8'); });
const longMessage: Message = {
  id: 'long', role: 'assistant',
  content: Array.from({length: 14}, (_, index) => `long-line-${index}`).join('\n'),
  createdAt: new Date(),
};
const longLayout = render(
  React.createElement(Box, {height: 7}, React.createElement(MessageList, {messages: [longMessage]})),
  {
    stdin: longInput as unknown as NodeJS.ReadStream,
    stdout: longOutput as unknown as NodeJS.WriteStream,
    stderr: longOutput as unknown as NodeJS.WriteStream,
    debug: true,
    exitOnCtrlC: false,
  },
);
await new Promise((resolve) => setTimeout(resolve, 50));
assert.match(stripAnsi(longFrame), /long-line-13/);
longFrame = '';
longInput.write('\x1b[5~');
await new Promise((resolve) => setTimeout(resolve, 50));
assert.match(stripAnsi(longFrame), /HISTORY/);
assert.match(stripAnsi(longFrame), /long-line-[0-9]/);
assert.doesNotMatch(stripAnsi(longFrame), /long-line-13/);
longLayout.unmount();

console.log('Message viewport tests passed.');
