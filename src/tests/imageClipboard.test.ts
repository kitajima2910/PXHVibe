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
} from '../components/PromptInput.js';
import {parseClipboardPayload, thumbnailSize} from '../utils/imageClipboard.js';
import {collapsePastedBlocksForDisplay} from '../utils/pastedText.js';
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
assert.equal(moveCursorVertically(25, 100, 20, -1), 5);
assert.equal(moveCursorVertically(25, 100, 20, 1), 45);
assert.equal(getCursorIndexFromPoint(14, 6, {x: 10, y: 5, width: 20, height: 2}, 80), 24);
assert.equal(getCursorIndexFromPoint(2, 2, {x: 10, y: 5, width: 20, height: 2}, 80), undefined);
assert.equal(shouldCollapsePaste('one\ntwo\nthree\nfour'), true);
assert.equal(shouldCollapsePaste('short text'), false);
assert.equal(countLines('one\ntwo\nthree'), 3);
assert.equal(createPastePreview('  one\n   two  '), 'one two');
const inputViewport = createInputViewport('1234567890abcdefghijKLMNOP', 22, 10, 2);
assert.equal(inputViewport.text, 'abcdefghij\nKLMNOP');
assert.equal(inputViewport.hiddenAbove, 1);
assert.equal(inputViewport.cursorIndex, 13);
assert.equal(composePromptInput('review this', ['line one\nline two']), 'review this\n\n[PASTED BLOCK 1]\nline one\nline two');
assert.equal(
  collapsePastedBlocksForDisplay('review this\n\n[PASTED BLOCK 1]\nline one\nline two'),
  'review this\n\n~ 2 lines',
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
assert.match(stripAnsi(editorFrame), /~ 4 lines/);
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

console.log('Image clipboard tests passed.');
