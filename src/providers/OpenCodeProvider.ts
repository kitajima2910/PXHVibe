import {spawn, type ChildProcessWithoutNullStreams} from 'node:child_process';
import {existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import type {AIProvider} from './AIProvider.js';
import type {ProviderRequestOptions, ProviderResponse} from '../types/provider.js';
import type {AgentEvent} from '../agent/types.js';
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
      const child = spawn(resolveOpenCodeExecutable(), buildOpenCodeArguments(
        prompt,
        this.model,
        options.attachments?.map((attachment) => attachment.path) ?? [],
      ), {
        cwd: options.cwd,
        shell: false,
        windowsHide: true,
      });
      // The runtime reads piped stdin before processing positional prompts.
      // Signal EOF immediately so it does not wait forever on Node's default pipe.
      child.stdin.end();
      this.activeProcess = child;

      let stdoutBuffer = '';
      let responseText = '';
      let fallbackText = '';
      let stderr = '';
      let stepCount = 0;
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
        stdoutBuffer += chunk;
        const lines = stdoutBuffer.split(/\r?\n/);
        stdoutBuffer = lines.pop() ?? '';
        for (const line of lines) {
          const parsed = parseOpenCodeEvent(line, stepCount);
          stepCount = parsed.stepCount;
          responseText += parsed.text;
          fallbackText += parsed.fallbackText;
          for (const event of parsed.events) options.onEvent?.(event);
        }
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
        if (stdoutBuffer.trim().length > 0) {
          const parsed = parseOpenCodeEvent(stdoutBuffer, stepCount);
          responseText += parsed.text;
          fallbackText += parsed.fallbackText;
          for (const event of parsed.events) options.onEvent?.(event);
        }
        const cleanStdout = (responseText || fallbackText).trim();
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

export function buildOpenCodeArguments(
  prompt: string,
  model: string,
  files: readonly string[] = [],
): string[] {
  return [
    'run',
    '--pure',
    '--format',
    'json',
    '--model',
    model,
    '--agent',
    'build',
    '--auto',
    ...files.flatMap((file) => ['--file', file]),
    prompt,
  ];
}

interface ParsedRuntimeEvent {
  events: AgentEvent[];
  text: string;
  fallbackText: string;
  stepCount: number;
}

export function parseOpenCodeEvent(line: string, currentStepCount = 0): ParsedRuntimeEvent {
  const cleanLine = stripAnsi(line).trim();
  if (cleanLine.length === 0) {
    return {events: [], text: '', fallbackText: '', stepCount: currentStepCount};
  }

  try {
    const value = JSON.parse(cleanLine) as {
      type?: string;
      part?: {
        text?: string;
        tool?: string;
        state?: {status?: string; title?: string; output?: string};
      };
    };

    if (value.type === 'step_start') {
      const stepCount = currentStepCount + 1;
      return {
        events: [{
          type: 'activity',
          content: stepCount === 1 ? 'Đang phân tích yêu cầu...' : 'Đang tiếp tục xử lý...',
        }],
        text: '',
        fallbackText: '',
        stepCount,
      };
    }

    if (value.type === 'tool_use' && value.part?.tool !== undefined) {
      const toolName = formatToolName(value.part.tool);
      const summary = value.part.state?.title || summarizeToolOutput(value.part.state?.output);
      return {
        events: [
          {type: 'tool_start', toolName},
          {type: 'tool_complete', toolName, summary},
        ],
        text: '',
        fallbackText: '',
        stepCount: currentStepCount,
      };
    }

    if (value.type === 'text' && value.part?.text !== undefined) {
      return {
        events: [{type: 'text_delta', content: value.part.text}],
        text: value.part.text,
        fallbackText: '',
        stepCount: currentStepCount,
      };
    }

    return {events: [], text: '', fallbackText: '', stepCount: currentStepCount};
  } catch {
    return {events: [], text: '', fallbackText: `${cleanLine}\n`, stepCount: currentStepCount};
  }
}

function formatToolName(toolName: string): string {
  const names: Record<string, string> = {
    bash: 'terminal',
    edit: 'chỉnh sửa file',
    glob: 'tìm file',
    grep: 'tìm nội dung',
    list: 'liệt kê file',
    read: 'đọc file',
    write: 'tạo file',
  };
  return names[toolName] ?? toolName;
}

function summarizeToolOutput(output: string | undefined): string {
  if (output === undefined || output.trim().length === 0) return 'Hoàn tất';
  const firstLine = stripAnsi(output).trim().split(/\r?\n/, 1)[0] ?? 'Hoàn tất';
  return firstLine.length > 120 ? `${firstLine.slice(0, 117)}...` : firstLine;
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
