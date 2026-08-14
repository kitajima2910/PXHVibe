#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import {App} from './app.js';
import {createProvider, parseModelName, parseProviderName} from './providers/createProvider.js';
import {enterTerminalScreen, setTerminalTitle} from './utils/terminalTitle.js';
import {appVersion} from './version.js';
import {formatCommandList} from './runtime/commands.js';

try {
  setTerminalTitle('PXHVibe');
  const args = process.argv.slice(2);
  if (args.includes('--version') || args.includes('-v')) {
    console.log(`PXHVibe v${appVersion}`);
    process.exitCode = 0;
  } else if (args.includes('--help') || args.includes('-h')) {
    console.log(`PXHVibe v${appVersion}\n\nChạy: pxh\n\nTUI commands:\n${formatCommandList()}`);
    process.exitCode = 0;
  } else {
  const providerName = parseProviderName(args);
  const provider = createProvider(
    providerName,
    providerName === 'free' ? parseModelName(args) : undefined,
  );
  const terminalScreen = enterTerminalScreen();
  const instance = render(<App provider={provider} />, {
    kittyKeyboard: {mode: 'enabled', flags: ['disambiguateEscapeCodes']},
    // Ink's built-in Ctrl+C handler only recognizes the legacy byte. Let the
    // components handle it so Kitty keyboard sequences from VS Code also work.
    exitOnCtrlC: false,
  });
  void instance.waitUntilExit().finally(() => terminalScreen.restore());
  }
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Không thể khởi tạo provider.';
  console.error(message);
  process.exitCode = 1;
}
