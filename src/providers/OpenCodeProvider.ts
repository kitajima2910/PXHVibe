import {spawn, type ChildProcessWithoutNullStreams} from 'node:child_process';
import {existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import type {AIProvider} from './AIProvider.js';
import type {ProviderRequestOptions, ProviderResponse} from '../types/provider.js';
import {stripAnsi} from '../utils/stripAnsi.js';

const missingCliMessage =
  'Không tìm thấy PXHVibe Free runtime. Hãy cài đặt lại PXHVibe.';
export const defaultOpenCodeModel = 'opencode/big-pickle';
const defaultRequestTimeoutMs = 120_000;

export class OpenCodeProvider implements AIProvider {
  readonly name: string;
  private activeProcess: ChildProcessWithoutNullStreams | undefined;

  constructor(private readonly model = defaultOpenCodeModel) {
    this.name = `Free · ${formatModelName(model)}`;
  }

  sendMessage(
    prompt: string,
    options: ProviderRequestOptions,
  ): Promise<ProviderResponse> {
    return new Promise((resolve, reject) => {
      // Automatic coding mode allows the selected agent to modify project files.
      const child = spawn(resolveOpenCodeExecutable(), [
        'run',
        '--pure',
        '--model',
        this.model,
        '--agent',
        'build',
        '--auto',
        prompt,
      ], {
        cwd: options.cwd,
        shell: false,
        windowsHide: true,
      });
      this.activeProcess = child;

      let stdout = '';
      let stderr = '';
      let settled = false;
      let timeout: ReturnType<typeof setTimeout> | undefined;

      const cleanup = (): void => {
        if (timeout !== undefined) clearTimeout(timeout);
        if (this.activeProcess === child) {
          this.activeProcess = undefined;
        }
        child.removeAllListeners();
        child.stdout.removeAllListeners();
        child.stderr.removeAllListeners();
      };

      const fail = (error: Error): void => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        reject(error);
      };

      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => {
        stdout += chunk;
      });
      child.stderr.on('data', (chunk: string) => {
        stderr += chunk;
      });
      child.on('error', (error: NodeJS.ErrnoException) => {
        fail(new Error(error.code === 'ENOENT' ? missingCliMessage : error.message));
      });
      child.on('close', (code) => {
        if (settled) {
          return;
        }

        settled = true;
        const cleanStdout = stripAnsi(stdout).trim();
        const cleanStderr = stripAnsi(stderr).trim();
        cleanup();

        if (code !== 0) {
          reject(new Error(cleanStderr || `Free mode đã thoát với mã lỗi ${code ?? 'không xác định'}.`));
          return;
        }

        if (cleanStdout.length === 0 && cleanStderr.length > 0) {
          reject(new Error(cleanStderr));
          return;
        }

        resolve({content: cleanStdout});
      });

      const timeoutMs = getRequestTimeoutMs();
      timeout = setTimeout(() => {
        child.kill();
        fail(new Error(
          `Free mode không phản hồi sau ${Math.round(timeoutMs / 1000)} giây. Hãy thử model khác bằng /models.`,
        ));
      }, timeoutMs);
    });
  }

  cancel(): void {
    const child = this.activeProcess;
    this.activeProcess = undefined;
    if (child !== undefined) {
      child.removeAllListeners();
      child.stdout.removeAllListeners();
      child.stderr.removeAllListeners();
      child.kill();
    }
  }
}

export function getRequestTimeoutMs(): number {
  const configuredValue = process.env.PXH_REQUEST_TIMEOUT_MS;
  if (configuredValue === undefined) return defaultRequestTimeoutMs;
  const parsedValue = Number(configuredValue);
  return Number.isFinite(parsedValue) && parsedValue >= 1_000
    ? parsedValue
    : defaultRequestTimeoutMs;
}

function formatModelName(model: string): string {
  const names: Record<string, string> = {
    'opencode/big-pickle': 'Big Pickle',
    'opencode/mimo-v2.5-free': 'MiMo V2.5',
    'opencode/deepseek-v4-flash-free': 'DeepSeek V4 Flash',
    'opencode/nemotron-3-ultra-free': 'Nemotron 3 Ultra',
    'opencode/nemotron-3.5-lightning-free': 'Nemotron 3.5 Lightning',
    'opencode/laguna-s-2.1-free': 'Laguna S 2.1',
    'opencode/hy3-free': 'Hy3',
    'opencode/ling-3.0-tiny-free': 'Ling 3.0 Tiny',
  };
  return names[model] ?? (model.split('/').at(-1) ?? model);
}

export function resolveOpenCodeExecutable(): string {
  const configuredPath = process.env.PXH_OPENCODE_PATH;
  if (configuredPath !== undefined && configuredPath.length > 0) return configuredPath;
  if (process.platform !== 'win32') return 'opencode';

  try {
    const bundledExecutable = createRequire(import.meta.url).resolve(
      'opencode-ai/bin/opencode.exe',
    );
    if (existsSync(bundledExecutable)) return bundledExecutable;
  } catch {
    // Fall through to PATH and legacy global npm locations.
  }

  for (const directory of (process.env.PATH ?? '').split(path.delimiter)) {
    const candidate = path.join(directory, 'opencode.exe');
    if (existsSync(candidate)) return candidate;
  }

  const appData = process.env.APPDATA;
  if (appData !== undefined) {
    const npmExecutable = path.join(
      appData,
      'npm',
      'node_modules',
      'opencode-ai',
      'bin',
      'opencode.exe',
    );
    if (existsSync(npmExecutable)) return npmExecutable;
  }

  return 'opencode';
}
