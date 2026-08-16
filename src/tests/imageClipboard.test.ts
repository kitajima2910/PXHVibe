import assert from 'node:assert/strict';
import React from 'react';
import {render} from 'ink';
import {PassThrough} from 'node:stream';
import {ImageThumbnail} from '../components/ImageThumbnail.js';
import {PromptInput} from '../components/PromptInput.js';
import {
  getCursorIndexFromPoint,
  isPasteShortcut,
  isNewlineShortcut,
  moveCursorVertically,
  shouldCollapsePaste,
  countLines,
  createPastePreview,
  createInputViewport,
  composePromptInput,
  formatElapsed,
  isSlashCommandInput,
} from '../components/PromptInput.js';
import {parseClipboardPayload, thumbnailSize} from '../utils/imageClipboard.js';
import {collapsePastedBlocksForDisplay, countDisplayLines} from '../utils/pastedText.js';
import {stripAnsi} from '../utils/stripAnsi.js';

const payload = parseClipboardPayload(JSON.stringify({
  path: 'C:\\Temp\\clipboard-test.png',
  width: 1920,
  height: 1080,
  pixels: [['#ff0000', '#00ff00'], ['#0000ff', '#ffffff']],
}));
assert.equal(payload.width, 1920);
assert.equal(thumbnailSize, 5);
assert.equal(payload.pixels[0]?.[1], '#00ff00');
assert.equal(isPasteShortcut('v', {ctrl: false, meta: true}), true);
assert.equal(isPasteShortcut('v', {ctrl: true, meta: false}), true);
assert.equal(isPasteShortcut('x', {ctrl: false, meta: true}), false);
assert.equal(isNewlineShortcut('\r', {return: true, shift: true}), true);
assert.equal(isNewlineShortcut('\n', {return: false, shift: false}), false);
assert.equal(isNewlineShortcut('[27;2;13~', {return: false, shift: false}), true);
assert.equal(isNewlineShortcut('\r', {return: true, shift: false}), false);
assert.equal(isNewlineShortcut('\r', {return: true, shift: false, meta: true}), true);
assert.equal(isNewlineShortcut('\r', {return: true, shift: false, ctrl: true}), true);
assert.equal(isSlashCommandInput('/models'), true);
assert.equal(isSlashCommandInput('/models extra'), false);
assert.equal(moveCursorVertically(25, 100, 20, -1), 5);
assert.equal(moveCursorVertically(25, 100, 20, 1), 45);
assert.equal(formatElapsed(192), '03:12');
assert.equal(getCursorIndexFromPoint(14, 6, {x: 10, y: 5, width: 20, height: 2}, 80), 24);
assert.equal(getCursorIndexFromPoint(2, 2, {x: 10, y: 5, width: 20, height: 2}, 80), undefined);
assert.equal(shouldCollapsePaste('one\ntwo\nthree\nfour'), true);
assert.equal(shouldCollapsePaste('short text'), false);
assert.equal(countLines('one\ntwo\nthree'), 3);
assert.equal(countDisplayLines('1234567890abcdefghij', 10), 2);
assert.equal(countDisplayLines('1234567890\nabcdefghijK', 10), 3);
assert.equal(createPastePreview('  one\n   two  '), 'one two');
const inputViewport = createInputViewport('1234567890abcdefghijKLMNOP', 22, 10, 2);
assert.equal(inputViewport.text, 'abcdefghij\nKLMNOP');
assert.equal(inputViewport.hiddenAbove, 1);
assert.equal(inputViewport.cursorIndex, 13);
assert.equal(composePromptInput('review this', ['line one\nline two']), 'review this\n\n[PASTED BLOCK 1]\nline one\nline two');
assert.equal(
  collapsePastedBlocksForDisplay('review this\n\n[PASTED BLOCK 1]\nline one\nline two'),
  'review this\n\n~2 dòng',
);
assert.equal(
  composePromptInput('', ['{\n  "name": "PXHVibe",\n  "enabled": true\n}']),
  '[PASTED BLOCK 1]\n{\n  "name": "PXHVibe",\n  "enabled": true\n}',
);
assert.equal(
  collapsePastedBlocksForDisplay(`[PASTED BLOCK 1]\n${'x'.repeat(161)}`, 80),
  '~3 dòng',
);

const output = new PassThrough();
Object.assign(output, {columns: 80, rows: 20, isTTY: true});
let rendered = '';
output.on('data', (chunk) => { rendered += chunk.toString('utf8'); });
const instance = render(React.createElement(ImageThumbnail, {image: {
  path: payload.path,
  name: 'clipboard-test.png',
  mimeType: 'image/png',
  width: payload.width,
  height: payload.height,
  size: 1536,
  thumbnail: payload.pixels,
}}), {stdout: output as unknown as NodeJS.WriteStream, debug: true});
await new Promise((resolve) => setTimeout(resolve, 30));
assert.match(stripAnsi(rendered), /1920×1080 · 2 KB/);
instance.unmount();

const editorInput = new PassThrough();
Object.assign(editorInput, {
  isTTY: true,
  setRawMode: () => editorInput,
  ref: () => editorInput,
  unref: () => editorInput,
});
const editorOutput = new PassThrough();
Object.assign(editorOutput, {columns: 100, rows: 30, isTTY: true});
let editorFrame = '';
let submitted = '';
let exitRequested = false;
editorOutput.on('data', (chunk) => { editorFrame += chunk.toString('utf8'); });
const editor = render(React.createElement(PromptInput, {
  onSubmit: (value: string) => { submitted = value; },
  onCancel: () => undefined,
  onExit: () => { exitRequested = true; },
  isBusy: false,
  attachments: [],
  onPasteImage: () => undefined,
  onRemoveLastImage: () => undefined,
}), {
  stdin: editorInput as unknown as NodeJS.ReadStream,
  stdout: editorOutput as unknown as NodeJS.WriteStream,
  stderr: editorOutput as unknown as NodeJS.WriteStream,
  debug: true,
  exitOnCtrlC: false,
});
await new Promise((resolve) => setTimeout(resolve, 30));
editorInput.write('\x1b[200~one\ntwo\nthree\nfour\x1b[201~');
await new Promise((resolve) => setTimeout(resolve, 30));
assert.match(stripAnsi(editorFrame), /~4 dòng/);
// Match the existing VS Code keybinding: Shift+Enter sends ESC + Enter.
editorInput.write('\x1b\r');
await new Promise((resolve) => setTimeout(resolve, 20));
editorInput.write('five');
await new Promise((resolve) => setTimeout(resolve, 20));
editorInput.write('\r');
await new Promise((resolve) => setTimeout(resolve, 30));
assert.equal(submitted, 'five\n\n[PASTED BLOCK 1]\none\ntwo\nthree\nfour');
editorInput.write('\x03');
await new Promise((resolve) => setTimeout(resolve, 20));
assert.equal(exitRequested, true);
editor.unmount();

const commandInput = new PassThrough();
Object.assign(commandInput, {
  isTTY: true,
  setRawMode: () => commandInput,
  ref: () => commandInput,
  unref: () => commandInput,
});
const commandOutput = new PassThrough();
Object.assign(commandOutput, {columns: 100, rows: 20, isTTY: true});
let command = '';
let preservedDraft: import('../components/PromptInput.js').PromptDraft | undefined;
const commandEditor = render(React.createElement(PromptInput, {
  onSubmit: (value, draft) => { command = value; preservedDraft = draft; },
  onCancel: () => undefined,
  onExit: () => undefined,
  isBusy: false,
  attachments: [],
  onPasteImage: () => undefined,
  onRemoveLastImage: () => undefined,
}), {
  stdin: commandInput as unknown as NodeJS.ReadStream,
  stdout: commandOutput as unknown as NodeJS.WriteStream,
  stderr: commandOutput as unknown as NodeJS.WriteStream,
  debug: true,
  exitOnCtrlC: false,
});
commandInput.write('\x1b[200~line one\nline two\nline three\nline four\x1b[201~');
await new Promise((resolve) => setTimeout(resolve, 30));
for (const character of '/models') {
  commandInput.write(character);
  await new Promise((resolve) => setTimeout(resolve, 3));
}
commandInput.write('\r');
await new Promise((resolve) => setTimeout(resolve, 40));
assert.equal(command, '/models');
assert.deepEqual(preservedDraft?.pastedBlocks, ['line one\nline two\nline three\nline four']);
commandEditor.unmount();

const busyInput = new PassThrough();
Object.assign(busyInput, {
  isTTY: true,
  setRawMode: () => busyInput,
  ref: () => busyInput,
  unref: () => busyInput,
});
const busyOutput = new PassThrough();
Object.assign(busyOutput, {columns: 100, rows: 20, isTTY: true});
let busyFrame = '';
let cancelled = 0;
busyOutput.on('data', (chunk) => { busyFrame += chunk.toString('utf8'); });
const busyEditor = render(React.createElement(PromptInput, {
  onSubmit: () => undefined,
  onCancel: () => { cancelled += 1; },
  onExit: () => undefined,
  isBusy: true,
  attachments: [],
  onPasteImage: () => undefined,
  onRemoveLastImage: () => undefined,
  busyStartedAt: Date.now() - 192_000,
  lastActivityAt: Date.now() - 181_000,
  activityLabel: 'Đang chờ model phản hồi...',
  phaseLabel: 'CODE 3/8',
}), {
  stdin: busyInput as unknown as NodeJS.ReadStream,
  stdout: busyOutput as unknown as NodeJS.WriteStream,
  stderr: busyOutput as unknown as NodeJS.WriteStream,
  debug: true,
  exitOnCtrlC: false,
});
await new Promise((resolve) => setTimeout(resolve, 30));
assert.match(stripAnsi(busyFrame), /WORKING 03:12/);
assert.match(stripAnsi(busyFrame), /CODE 3\/8/);
busyInput.write('\x1b');
await new Promise((resolve) => setTimeout(resolve, 40));
assert.match(stripAnsi(busyFrame), /Nhấn ESC lần nữa để dừng lượt chạy/);
assert.equal(cancelled, 0);
busyInput.write('\x1b');
await new Promise((resolve) => setTimeout(resolve, 40));
assert.equal(cancelled, 1);
busyEditor.unmount();

console.log('Image clipboard tests passed.');
