import assert from 'node:assert/strict';
import {OpenAIModelProvider} from '../agent/OpenAIModelProvider.js';
import {AnthropicModelProvider} from '../agent/AnthropicModelProvider.js';
import {GeminiModelProvider} from '../agent/GeminiModelProvider.js';
import type {ModelProvider} from '../agent/ModelProvider.js';

const openai: ModelProvider = new OpenAIModelProvider('gpt-4o', 'test-key', 'https://api.openai.com/v1');
const anthropic: ModelProvider = new AnthropicModelProvider('claude-3-5-sonnet-20241022', 'sk-ant-test', 'https://api.anthropic.com');
const gemini: ModelProvider = new GeminiModelProvider('gemini-2.0-flash', 'test-key', 'https://generativelanguage.googleapis.com');

assert.equal(typeof openai.createTurn, 'function');
assert.equal(typeof anthropic.createTurn, 'function');
assert.equal(typeof gemini.createTurn, 'function');

const anthropicNoBase = new AnthropicModelProvider('claude-3-opus-20240229', 'sk-ant-test');
const geminiNoBase = new GeminiModelProvider('gemini-1.5-flash', 'test-key');
assert.equal(typeof anthropicNoBase.createTurn, 'function');
assert.equal(typeof geminiNoBase.createTurn, 'function');

console.log('Model provider tests: passed');
