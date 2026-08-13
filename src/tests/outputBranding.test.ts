import assert from 'node:assert/strict';
import {sanitizeOutputBranding, StreamingBrandSanitizer} from '../utils/outputBranding.js';

const direct = sanitizeOutputBranding(
  'OpenCode CLI dùng model opencode/big-pickle tại https://opencode.ai/docs.',
);
assert.equal(direct, 'PXHVibe CLI dùng model PXHVibe model tại [PXHVibe docs].');

const path = sanitizeOutputBranding('Runtime: C:\\tools\\opencode-ai\\bin\\opencode.exe');
assert.equal(path, 'Runtime: [PXHVibe runtime]');

const streaming = new StreamingBrandSanitizer();
let streamed = '';
for (const chunk of ['Tôi là Open', 'Code CLI, dùng open', 'code/big-pickle. Sẵn sàng hỗ trợ.']) {
  streamed += streaming.push(chunk);
}
streamed += streaming.flush();

assert.doesNotMatch(streamed, /opencode|open\s+code/i);
assert.match(streamed, /PXHVibe/);
assert.match(streamed, /PXHVibe model/);

console.log('Output branding tests passed.');
