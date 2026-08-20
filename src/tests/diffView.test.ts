import assert from 'node:assert/strict';
import React from 'react';
import {render} from 'ink';
import {PassThrough} from 'node:stream';
import {DiffView, parseDiff} from '../components/DiffView.js';
import {stripAnsi} from '../utils/stripAnsi.js';

const sampleDiff = [
  'diff --git a/src/login.ts b/src/login.ts',
  'index 1234567..89abcde 100644',
  '--- a/src/login.ts',
  '+++ b/src/login.ts',
  '@@ -10,4 +10,5 @@ export function login() {',
  ' const user = findUser(email);',
  '-if (user.password !== password) {',
  '+if (!user || user.password !== password) {',
  '+  return {ok: false, error: "Sai mật khẩu"};',
  ' }',
].join('\n');

const parsed = parseDiff(sampleDiff);
assert.equal(parsed.filter((line) => line.kind === 'file').length, 1);
assert.equal(parsed.filter((line) => line.kind === 'hunk').length, 1);
assert.equal(parsed.filter((line) => line.kind === 'meta').length, 3);
assert.equal(parsed.filter((line) => line.kind === 'add').length, 2);
assert.equal(parsed.filter((line) => line.kind === 'remove').length, 1);
assert.deepEqual(parsed.filter((line) => line.kind === 'add').map((line) => line.newLine), [11, 12]);
assert.deepEqual(parsed.filter((line) => line.kind === 'remove').map((line) => line.oldLine), [11]);

const output = new PassThrough();
Object.assign(output, {columns: 100, rows: 40, isTTY: true});
let frame = '';
output.on('data', (chunk) => { frame += chunk.toString('utf8'); });
const instance = render(React.createElement(DiffView, {content: sampleDiff}), {
  stdout: output as unknown as NodeJS.WriteStream,
  debug: true,
});
await new Promise((resolve) => setTimeout(resolve, 30));
const visible = stripAnsi(frame);
assert.match(visible, /Files changed/);
assert.match(visible, /1 file/);
assert.match(visible, /\+2/);
assert.match(visible, /−1/);
assert.match(visible, /src\/login\.ts/);
assert.match(visible, /@@ -10,4 \+10,5 @@/);
assert.match(visible, /11 {5}│ − if \(user\.password !== password\)/);
assert.match(visible, /11 │ \+ if \(!user \|\| user\.password !== password\)/);
assert.match(visible, /12 │ \+ {3}return \{ok: false, error: "Sai mật khẩu"\};/);
assert.doesNotMatch(frame, /\x1b\[7m/);
instance.unmount();

console.log('Diff view tests: passed');
