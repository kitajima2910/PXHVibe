import {spawn, type ChildProcessWithoutNullStreams} from 'node:child_process';
import {existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import type {AIProvider} from './AIProvider.js';
import type {ProviderRequestOptions, ProviderResponse} from '../types/provider.js';
import {stripAnsi} from '../utils/stripAnsi.js';

const missingCliMessage =
  'Không tìm thấy OpenCode CLI. Hãy cài đặt và đăng nhập OpenCode trước.';
export const defaultOpenCodeModel = 'opencode/mimo-v2.5-free';

export class OpenCodeProvider implements AIProvider {
  readonly name: string;
  private activeProcess: ChildProcessWithoutNullStreams | undefined;

  constructor(private readonly model = defaultOpenCodeModel) {
    this.name = `OpenCode Free (${model.split('/').at(-1) ?? model})`;
  }

  sendMessage(
    prompt: string,
    options: ProviderRequestOptions,
  ): Promise<ProviderResponse> {
    return new Promise((resolve, reject) => {
      // --auto enables OpenCode to execute the coding task and modify project files.
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

      const cleanup = (): void => {
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
          reject(new Error(cleanStderr || `OpenCode đã thoát với mã lỗi ${code ?? 'không xác định'}.`));
          return;
        }

        if (cleanStdout.length === 0 && cleanStderr.length > 0) {
          reject(new Error(cleanStderr));
          return;
        }

        resolve({content: cleanStdout});
      });
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
