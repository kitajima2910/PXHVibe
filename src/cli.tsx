#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import {App} from './app.js';
import {createProvider, parseModelName, parseProviderName} from './providers/createProvider.js';

try {
  const args = process.argv.slice(2);
  const providerName = parseProviderName(args);
  const provider = createProvider(
    providerName,
    providerName === 'opencode' ? parseModelName(args) : undefined,
  );
  render(<App provider={provider} />);
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Không thể khởi tạo provider.';
  console.error(message);
  process.exitCode = 1;
}
