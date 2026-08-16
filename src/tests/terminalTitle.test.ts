import assert from 'node:assert/strict';
import {enterTerminalScreen, setTerminalTitle} from '../utils/terminalTitle.js';

let output = '';
setTerminalTitle('PXH\u0007Vibe', {isTTY: true, write(value) { output += value; }});
assert.equal(output, '\u001B]0;PXHVibe\u0007');
assert.equal(process.title, 'PXH\u0007Vibe');

let screenOutput = '';
const screen = enterTerminalScreen('PXHVibe', {isTTY: true, write(value) { screenOutput += value; }});
screen.restore();
assert.equal(
  screenOutput,
  '\u001B[?1049h\u001B[?25l\u001B[?1000h\u001B[?1002h\u001B[?1006h\u001B[2J\u001B[H'
  + '\u001B]0;PXHVibe\u0007'
  + '\u001B[?1006l\u001B[?1002l\u001B[?1000l\u001B[?25h\u001B[?1049l',
);

console.log('Terminal title tests: passed');
