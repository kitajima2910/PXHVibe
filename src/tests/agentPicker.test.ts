import assert from 'node:assert/strict';
import React from 'react';
import {render} from 'ink';
import {PassThrough} from 'node:stream';
import {AgentPicker, compactAgentDescription} from '../components/AgentPicker.js';
import type {PXHAgent} from '../agents.js';
import {stripAnsi} from '../utils/stripAnsi.js';

assert.equal(compactAgentDescription('  Phân loại\nTARGET   và route.  '), 'Phân loại TARGET và route.');
assert.equal(compactAgentDescription('123456789', 6), '12345…');

const agents: PXHAgent[] = [
  {id: 'auto', label: 'PXH PM (Auto)', description: 'Điều phối workflow và specialist.', instruction: 'Điều phối.'},
  {id: 'expert', label: 'PXH Expert', description: 'Triển khai tính năng tổng quát.', instruction: 'Triển khai.'},
];
const output = new PassThrough();
Object.assign(output, {columns: 60, rows: 20, isTTY: true});
let frame = '';
output.on('data', (chunk) => { frame += chunk.toString('utf8'); });
const instance = render(React.createElement(AgentPicker, {
  agents,
  onSelect: () => undefined,
  onCancel: () => undefined,
}), {stdout: output as unknown as NodeJS.WriteStream, debug: true});
await new Promise((resolve) => setTimeout(resolve, 30));
const visible = stripAnsi(frame);
assert.match(visible, /SPECIALISTS/);
assert.match(visible, /1\/2/);
assert.match(visible, /● PXH PM \(Auto\)/);
assert.match(visible, /Điều phối workflow và specialist/);
assert.doesNotMatch(visible, /Triển khai tính năng tổng quát/);
assert.match(visible, /Enter sử dụng/);
instance.unmount();

console.log('Agent picker tests passed.');
