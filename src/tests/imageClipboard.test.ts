import assert from 'node:assert/strict';
import React from 'react';
import {render} from 'ink';
import {PassThrough} from 'node:stream';
import {ImageThumbnail} from '../components/ImageThumbnail.js';
import {isPasteShortcut} from '../components/PromptInput.js';
import {parseClipboardPayload} from '../utils/imageClipboard.js';
import {stripAnsi} from '../utils/stripAnsi.js';

const payload = parseClipboardPayload(JSON.stringify({
  path: 'C:\\Temp\\clipboard-test.png',
  width: 1920,
  height: 1080,
  pixels: [['#ff0000', '#00ff00'], ['#0000ff', '#ffffff']],
}));
assert.equal(payload.width, 1920);
assert.equal(payload.pixels[0]?.[1], '#00ff00');
assert.equal(isPasteShortcut('v', {ctrl: false, meta: true}), true);
assert.equal(isPasteShortcut('v', {ctrl: true, meta: false}), true);
assert.equal(isPasteShortcut('x', {ctrl: false, meta: true}), false);

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

console.log('Image clipboard tests passed.');
