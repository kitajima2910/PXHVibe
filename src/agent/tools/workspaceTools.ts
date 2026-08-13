import {spawn} from 'node:child_process';
import {lstat, mkdir, readFile, realpath, readdir, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import type {AgentTool} from '../types.js';

const ignoredDirectories = new Set(['.git', 'dist', 'node_modules']);
const maxFileBytes = 1_000_000;
const maxOutputCharacters = 40_000;

export function createWorkspaceTools(): readonly AgentTool[] {
  return [listFilesTool, readFileTool, searchTextTool, applyPatchTool, gitDiffTool];
}

const listFilesTool: AgentTool = {
  name: 'list_files',
  description: 'List project files recursively under a workspace-relative directory.',
  parameters: objectSchema({path: stringSchema('Workspace-relative directory, or . for root.')}),
  async execute(value, cwd) {
    const {path: requestedPath} = requireStrings(value, ['path']);
    const target = await resolveSafePath(cwd, requestedPath);
    const files = await walkFiles(target, cwd);
    return limitOutput(files.join('\n') || '(không có file)');
  },
};

const readFileTool: AgentTool = {
  name: 'read_file',
  description: 'Read a UTF-8 text file inside the workspace.',
  parameters: objectSchema({path: stringSchema('Workspace-relative file path.')}),
  async execute(value, cwd) {
    const {path: requestedPath} = requireStrings(value, ['path']);
    const target = await resolveSafePath(cwd, requestedPath);
    const metadata = await stat(target);
    if (!metadata.isFile()) {
      throw new Error('Đường dẫn không phải file.');
    }
    if (metadata.size > maxFileBytes) {
      throw new Error('File vượt quá giới hạn 1 MB.');
    }
    return limitOutput(await readFile(target, 'utf8'));
  },
};

const searchTextTool: AgentTool = {
  name: 'search_text',
  description: 'Search literal text in UTF-8 project files.',
  parameters: objectSchema({
    path: stringSchema('Workspace-relative directory or file.'),
    query: stringSchema('Case-sensitive literal text to find.'),
  }),
  async execute(value, cwd) {
    const values = requireStrings(value, ['path', 'query']);
    if (values.query.length === 0) {
      throw new Error('Query không được rỗng.');
    }
    const target = await resolveSafePath(cwd, values.path);
    const metadata = await stat(target);
    const files = metadata.isFile() ? [target] : await walkAbsoluteFiles(target);
    const matches: string[] = [];
    for (const file of files.slice(0, 500)) {
      const fileMetadata = await stat(file);
      if (fileMetadata.size > maxFileBytes) continue;
      const fileContent = await readFile(file, 'utf8').catch(() => '');
      for (const [index, line] of fileContent.split(/\r?\n/).entries()) {
        if (line.includes(values.query)) {
          matches.push(`${path.relative(cwd, file)}:${index + 1}: ${line}`);
        }
      }
    }
    return limitOutput(matches.join('\n') || '(không tìm thấy)');
  },
};

const applyPatchTool: AgentTool = {
  name: 'apply_patch',
  description: 'Create a text file or replace one exact, unique text block in a workspace file.',
  parameters: objectSchema({
    path: stringSchema('Workspace-relative file path.'),
    old_text: stringSchema('Exact existing text. Use an empty string only when creating a new file.'),
    new_text: stringSchema('Replacement or new file content.'),
  }),
  async execute(value, cwd) {
    const values = requireStrings(value, ['path', 'old_text', 'new_text']);
    const target = await resolveSafePath(cwd, values.path, true);
    const exists = await lstat(target).then(() => true, () => false);

    if (values.old_text.length === 0) {
      if (exists) throw new Error('File đã tồn tại; cần cung cấp old_text để sửa.');
      await mkdir(path.dirname(target), {recursive: true});
      await writeFile(target, values.new_text, 'utf8');
      return `Đã tạo ${path.relative(cwd, target)}.`;
    }
    if (!exists) throw new Error('Không tìm thấy file cần sửa.');

    const current = await readFile(target, 'utf8');
    const firstIndex = current.indexOf(values.old_text);
    if (firstIndex === -1) throw new Error('Không tìm thấy old_text trong file.');
    if (current.indexOf(values.old_text, firstIndex + values.old_text.length) !== -1) {
      throw new Error('old_text xuất hiện nhiều lần; cần cung cấp đoạn duy nhất.');
    }
    const updated = `${current.slice(0, firstIndex)}${values.new_text}${current.slice(firstIndex + values.old_text.length)}`;
    await writeFile(target, updated, 'utf8');
    return `Đã cập nhật ${path.relative(cwd, target)}.`;
  },
};

const gitDiffTool: AgentTool = {
  name: 'git_diff',
  description: 'Show the current read-only Git diff for the workspace.',
  parameters: objectSchema({path: stringSchema('Workspace-relative path, or . for all changes.')}),
  async execute(value, cwd) {
    const {path: requestedPath} = requireStrings(value, ['path']);
    await resolveSafePath(cwd, requestedPath, true);
    return runGitDiff(cwd, requestedPath);
  },
};

async function resolveSafePath(cwd: string, requestedPath: string, allowMissing = false): Promise<string> {
  const workspace = await realpath(cwd);
  const target = path.resolve(workspace, requestedPath);
  assertInside(workspace, target);

  try {
    const resolvedTarget = await realpath(target);
    assertInside(workspace, resolvedTarget);
    return resolvedTarget;
  } catch (error: unknown) {
    if (!allowMissing) throw error;
    const existingAncestor = await findExistingAncestor(path.dirname(target));
    const resolvedAncestor = await realpath(existingAncestor);
    assertInside(workspace, resolvedAncestor);
    return target;
  }
}

async function findExistingAncestor(start: string): Promise<string> {
  let candidate = start;
  while (true) {
    if (await lstat(candidate).then(() => true, () => false)) return candidate;
    const parent = path.dirname(candidate);
    if (parent === candidate) throw new Error('Không tìm thấy thư mục cha hợp lệ.');
    candidate = parent;
  }
}

function assertInside(workspace: string, target: string): void {
  const relative = path.relative(workspace, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Đường dẫn nằm ngoài workspace.');
  }
}

async function walkFiles(directory: string, cwd: string): Promise<string[]> {
  const files = await walkAbsoluteFiles(directory);
  return files.map((file) => path.relative(cwd, file)).sort();
}

async function walkAbsoluteFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, {withFileTypes: true});
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) files.push(...await walkAbsoluteFiles(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
}

function requireStrings<T extends string>(value: unknown, keys: readonly T[]): Record<T, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Arguments phải là object.');
  }
  const record = value as Record<string, unknown>;
  const result = {} as Record<T, string>;
  for (const key of keys) {
    if (typeof record[key] !== 'string') throw new Error(`Thiếu string argument: ${key}.`);
    result[key] = record[key];
  }
  return result;
}

function objectSchema(properties: Record<string, unknown>): Record<string, unknown> {
  return {type: 'object', properties, required: Object.keys(properties), additionalProperties: false};
}

function stringSchema(description: string): Record<string, unknown> {
  return {type: 'string', description};
}

function limitOutput(value: string): string {
  return value.length > maxOutputCharacters
    ? `${value.slice(0, maxOutputCharacters)}\n...(đã cắt bớt)`
    : value;
}

function runGitDiff(cwd: string, requestedPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['diff', '--', requestedPath], {cwd, shell: false, windowsHide: true});
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => { stdout += chunk; });
    child.stderr.on('data', (chunk: string) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(stderr.trim() || `git diff lỗi (${code ?? '?'})`));
      else resolve(limitOutput(stdout.trim() || '(không có thay đổi)'));
    });
  });
}
