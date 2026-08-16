import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

export interface DisplayPhase {
  phase: string;
  agent: string;
  status?: string;
  attempts?: number;
}

export const commandDefinitions = [
  ['/help', 'Danh sách lệnh'], ['/models', 'Chọn model'], ['/agents', 'Chọn agent'],
  ['/skills', 'Xem skills'], ['/workflows', 'Xem workflows'], ['/status', 'Capability status'],
  ['/mcp', 'MCP server status'],
  ['/pipeline', 'Pipeline gần nhất'], ['/validate', 'Validate runtime'], ['/paste', 'Dán ảnh'],
  ['/copy', 'Copy response'], ['/cancel', 'Hủy phase hiện tại'], ['/retry', 'Chạy lại TARGET'],
  ['/new', 'Tạo session mới'], ['/resume', 'Tiếp tục checkpoint'], ['/session', 'Session state'],
  ['/context', 'Context usage'], ['/detect', 'Nhận dạng project'], ['/doctor', 'Chẩn đoán runtime'],
  ['/diff', 'Git diff summary'], ['/history', 'Lịch sử phase'], ['/version', 'Phiên bản'],
  ['/about', 'Thông tin PXHVibe'], ['/clear', 'Dọn timeline TUI'],
] as const;

export function formatCommandList(): string {
  return [
    'AI       /models  /agents  /skills  /workflows',
    'Phiên    /new  /resume  /retry  /session  /history  /clear',
    'Project  /status  /mcp  /pipeline  /validate  /context  /detect  /doctor  /diff',
    'Tiện ích /paste  /copy  /cancel  /version  /about  /help',
  ].join('\n');
}

export function formatPipelineDetails(workflow: string, phases: readonly DisplayPhase[]): string {
  const passed = phases.filter((phase) => phase.status === 'pass').length;
  const lines = phases.map((phase) => `${phaseSymbol(phase.status)} ${phase.phase.toUpperCase()} · ${phase.agent}${phase.status === undefined ? '' : ` · ${phase.status}`}`);
  return [`PIPELINE · ${workflow.toUpperCase()} · ${passed}/${phases.length}`, ...lines].join('\n');
}

export function formatHistoryDetails(phases: readonly DisplayPhase[]): string {
  const lines = phases.map((phase) => `${phaseSymbol(phase.status)} ${phase.phase.toUpperCase()} · ${phase.status ?? 'pending'}${phase.attempts === undefined ? '' : ` · ${phase.attempts} lần`}`);
  return [`HISTORY · ${phases.length} PHASES`, ...lines].join('\n');
}

export function detectProject(cwd: string): string {
  const signals: string[] = [];
  const packagePath = join(cwd, 'package.json');
  if (existsSync(packagePath)) {
    signals.push('Node.js');
    try {
      const packageInfo = JSON.parse(readFileSync(packagePath, 'utf8')) as {dependencies?: Record<string, string>; devDependencies?: Record<string, string>};
      const dependencies = {...packageInfo.dependencies, ...packageInfo.devDependencies};
      if ('next' in dependencies) signals.push('Next.js');
      else if ('react' in dependencies) signals.push('React');
      if ('phaser' in dependencies) signals.push('Phaser');
      if ('three' in dependencies || '@react-three/fiber' in dependencies) signals.push('Three.js');
      if ('typescript' in dependencies) signals.push('TypeScript');
    } catch {
      signals.push('package.json lỗi');
    }
  }
  if (existsSync(join(cwd, 'pyproject.toml')) || existsSync(join(cwd, 'requirements.txt'))) signals.push('Python');
  if (existsSync(join(cwd, 'Cargo.toml'))) signals.push('Rust');
  if (existsSync(join(cwd, 'go.mod'))) signals.push('Go');
  if (existsSync(join(cwd, '.git'))) signals.push('Git');
  return signals.length === 0 ? 'Project trống hoặc chưa nhận dạng được stack.' : `Project: ${[...new Set(signals)].join(' · ')}`;
}

export function getGitDiffSummary(cwd: string): string {
  const result = spawnSync('git', ['diff', '--stat'], {cwd, encoding: 'utf8', windowsHide: true, timeout: 10_000});
  if (result.error !== undefined) return `Không đọc được git diff: ${result.error.message}`;
  if (result.status !== 0) return 'Thư mục hiện tại không phải Git repository hoặc git diff thất bại.';
  const output = result.stdout.trim();
  return formatDiffStat(output);
}

export interface GitDiffResult {
  ok: boolean;
  message?: string;
  content?: string;
}

/** Lấy toàn bộ unified diff (`git diff` không có --stat) để render kiểu git. */
export function getGitDiffFull(cwd: string): GitDiffResult {
  const result = spawnSync('git', ['diff'], {cwd, encoding: 'utf8', windowsHide: true, timeout: 10_000});
  if (result.error !== undefined) return {ok: false, message: `Không đọc được git diff: ${result.error.message}`};
  if (result.status !== 0) return {ok: false, message: 'Thư mục hiện tại không phải Git repository hoặc git diff thất bại.'};
  const content = result.stdout.trim();
  if (content.length === 0) return {ok: true};
  return {ok: true, content};
}

export function formatDiffStat(output: string, maxLines = 8): string {
  if (output.length === 0) return 'Git diff sạch.';
  const lines = output.split(/\r?\n/);
  const visible = lines.slice(0, Math.max(1, maxLines)).map((line) => line.length <= 120 ? line : `${line.slice(0, 119)}…`);
  const remaining = lines.length - visible.length;
  return ['GIT DIFF', ...visible, ...(remaining > 0 ? [`… còn ${remaining} dòng`] : [])].join('\n');
}

function phaseSymbol(status: string | undefined): string {
  if (status === 'pass') return '✓';
  if (status === 'running') return '●';
  if (status === 'fail') return '✖';
  if (status === 'cancelled') return '■';
  return '○';
}
