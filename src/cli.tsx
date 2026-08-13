#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import {App} from './app.js';
import {createProvider, parseProviderName} from './providers/createProvider.js';

try {
  const provider = createProvider(parseProviderName(process.argv.slice(2)));
  render(<App provider={provider} />);
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Không thể khởi tạo provider.';
  console.error(message);
  process.exitCode = 1;
}
