import assert from 'node:assert/strict';
import {modes} from '../modes.js';
import {CustomAgentProvider} from '../providers/CustomAgentProvider.js';
import {checkFreeModelHealth, isModelHealthFresh} from '../utils/modelHealth.js';
import type {AIProvider} from '../providers/AIProvider.js';

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

const latencies: Record<string, number> = {
  'opencode/big-pickle': 40,
  'opencode/mimo-v2.5-free': 1,
};
const report = await checkFreeModelHealth(modes.slice(0, 2), process.cwd(), (model): AIProvider => ({
  name: model,
  async sendMessage() {
    await new Promise((resolve) => setTimeout(resolve, latencies[model] ?? 1));
    return {content: 'OK'};
  },
  cancel() {},
}));
assert.equal(report.results.length, 2);
assert.equal(report.recommendedModeId, 'mimo');
assert.equal(isModelHealthFresh(report, report.checkedAt + 1_000), true);
assert.equal(isModelHealthFresh(report, report.checkedAt + 11 * 60_000), false);

console.log('Mode catalog tests: passed');
