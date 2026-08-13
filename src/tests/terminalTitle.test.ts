import assert from 'node:assert/strict';
import {setTerminalTitle} from '../utils/terminalTitle.js';

let output = '';
setTerminalTitle('PXH\u0007Vibe', {isTTY: true, write(value) { output += value; }});
assert.equal(output, '\u001B]0;PXHVibe\u0007');
assert.equal(process.title, 'PXH\u0007Vibe');

console.log('Terminal title tests: passed');
