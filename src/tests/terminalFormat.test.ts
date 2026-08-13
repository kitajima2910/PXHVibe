import assert from 'node:assert/strict';
import {parseTerminalBlocks} from '../utils/terminalFormat.js';

const blocks = parseTerminalBlocks(`# Kết quả

- Đã sửa \`app.ts\`
1. Chạy test
> Không có lỗi

\`\`\`ts
const ready = true;
\`\`\``);

assert.deepEqual(blocks.map((block) => block.type), [
  'heading', 'blank', 'bullet', 'numbered', 'quote', 'blank', 'code',
]);
const code = blocks.at(-1);
assert.ok(code?.type === 'code');
assert.equal(code.language, 'ts');
assert.equal(code.content, 'const ready = true;');

console.log('Terminal formatter tests: passed');
