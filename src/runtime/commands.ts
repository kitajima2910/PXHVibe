import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

export const commandDefinitions = [
  ['/help', 'Danh sách lệnh'], ['/models', 'Chọn model'], ['/agents', 'Chọn agent'],
  ['/skills', 'Xem skills'], ['/workflows', 'Xem workflows'], ['/status', 'Capability status'],
  ['/pipeline', 'Pipeline gần nhất'], ['/validate', 'Validate runtime'], ['/paste', 'Dán ảnh'],
  ['/copy', 'Copy response'], ['/cancel', 'Hủy phase hiện tại'], ['/retry', 'Chạy lại TARGET'],
  ['/new', 'Tạo session mới'], ['/resume', 'Tiếp tục checkpoint'], ['/session', 'Session state'],
  ['/context', 'Context usage'], ['/detect', 'Nhận dạng project'], ['/doctor', 'Chẩn đoán runtime'],
  ['/diff', 'Git diff summary'], ['/history', 'Lịch sử phase'], ['/version', 'Phiên bản'],
  ['/about', 'Thông tin PXHVibe'], ['/clear', 'Dọn timeline TUI'],
] as const;

export function formatCommandList(): string {
  return commandDefinitions.map(([command]) => command).join(' · ');
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
  return output.length === 0 ? 'Git diff sạch.' : output.slice(0, 4_000);
}
