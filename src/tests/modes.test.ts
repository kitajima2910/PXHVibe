import assert from 'node:assert/strict';
import {modes} from '../modes.js';
import {CustomAgentProvider} from '../providers/CustomAgentProvider.js';

assert.equal(modes[0]?.label, 'Big Pickle (Free)');
assert.ok(modes.some((mode) => mode.id === 'custom'));
assert.ok(!modes.some((mode) => mode.id === 'native'));
assert.ok(!modes.some((mode) => mode.id === 'mock'));
assert.ok(modes.every((mode) => !mode.description.toLowerCase().includes('opencode')));

const custom = new CustomAgentProvider({
  baseURL: 'http://localhost:11434/v1',
  model: 'local-model',
  apiKey: 'secret-value',
});
assert.equal(custom.name, 'Custom API · local-model');
assert.ok(!custom.name.includes('secret-value'));

console.log('Mode catalog tests: passed');
