#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import {App} from './app.js';
import {createProvider, parseModelName, parseProviderName} from './providers/createProvider.js';
import {enterTerminalScreen, setTerminalTitle} from './utils/terminalTitle.js';

try {
  setTerminalTitle('PXHVibe');
  const args = process.argv.slice(2);
  const providerName = parseProviderName(args);
  const provider = createProvider(
    providerName,
    providerName === 'free' ? parseModelName(args) : undefined,
  );
  const terminalScreen = enterTerminalScreen();
  const instance = render(<App provider={provider} />);
  void instance.waitUntilExit().finally(() => terminalScreen.restore());
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Không thể khởi tạo provider.';
  console.error(message);
  process.exitCode = 1;
}
