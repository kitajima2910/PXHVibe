import {spawn, type ChildProcessWithoutNullStreams} from 'node:child_process';
import type {AIProvider} from './AIProvider.js';
import type {ProviderRequestOptions, ProviderResponse} from '../types/provider.js';
import {stripAnsi} from '../utils/stripAnsi.js';

const missingCliMessage =
  'Không tìm thấy OpenCode CLI. Hãy cài đặt và đăng nhập OpenCode trước.';

export class OpenCodeProvider implements AIProvider {
  readonly name = 'OpenCode';
  private activeProcess: ChildProcessWithoutNullStreams | undefined;

  sendMessage(
    prompt: string,
    options: ProviderRequestOptions,
  ): Promise<ProviderResponse> {
    return new Promise((resolve, reject) => {
      // --auto enables OpenCode to execute the coding task and modify project files.
      const child = spawn('opencode', ['run', '--agent', 'build', '--auto', prompt], {
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
