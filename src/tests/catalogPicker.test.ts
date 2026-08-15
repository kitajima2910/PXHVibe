import assert from 'node:assert/strict';
import React from 'react';
import {render} from 'ink';
import {PassThrough} from 'node:stream';
import {CatalogPicker, compactCatalogText, expandCodeBlocks, type CatalogPickerItem} from '../components/CatalogPicker.js';
import {parseTerminalBlocks} from '../utils/terminalFormat.js';
import {stripAnsi} from '../utils/stripAnsi.js';

assert.equal(compactCatalogText('  Mô tả\nskill   gọn.  '), 'Mô tả skill gọn.');
assert.equal(compactCatalogText('123456789', 6), '12345…');
assert.equal(expandCodeBlocks(parseTerminalBlocks('```ts\n1\n2\n3\n```'), 2).length, 2);

const items: CatalogPickerItem[] = Array.from({length: 12}, (_, index) => ({
  id: `skill-${index + 1}`,
  label: `Skill ${index + 1}`,
  description: `Mô tả ${index + 1}`,
  meta: 'bundled',
  markdown: '# Chi tiết\n\n- Dòng **đậm**\n- Dùng `npm test`',
}));
const input = new PassThrough();
Object.assign(input, {isTTY: true, setRawMode: () => input, ref: () => input, unref: () => input});
const output = new PassThrough();
Object.assign(output, {columns: 60, rows: 24, isTTY: true});
let frame = '';
output.on('data', (chunk) => { frame += chunk.toString('utf8'); });
const instance = render(React.createElement(CatalogPicker, {
  title: 'SKILLS', items, onClose: () => undefined, pageSize: 5,
}), {
  stdin: input as unknown as NodeJS.ReadStream,
  stdout: output as unknown as NodeJS.WriteStream,
  debug: true,
  exitOnCtrlC: false,
});
await new Promise((resolve) => setTimeout(resolve, 30));
const visible = stripAnsi(frame);
assert.match(visible, /SKILLS/);
assert.match(visible, /1\/12/);
assert.match(visible, /● Skill 1/);
assert.match(visible, /↓ 7 mục phía dưới/);
assert.match(visible, /Mô tả 1/);
assert.doesNotMatch(visible, /Mô tả 2/);
assert.match(visible, /PgUp\/PgDn/);
assert.match(visible, /Enter.*xem Markdown/);
input.write('\r');
await new Promise((resolve) => setTimeout(resolve, 30));
const markdownFrame = stripAnsi(frame);
assert.match(markdownFrame, /SKILLS · Skill 1/);
assert.match(markdownFrame, /▰ Chi tiết/);
assert.match(markdownFrame, /◆ Dòng đậm/);
assert.match(markdownFrame, /npm test/);
assert.doesNotMatch(markdownFrame, /# Chi tiết/);
input.write('\x1b');
await new Promise((resolve) => setTimeout(resolve, 30));
assert.match(stripAnsi(frame), /● Skill 1/);
instance.unmount();

console.log('Catalog picker tests passed.');
