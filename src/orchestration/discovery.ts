import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {basename, dirname, join, parse, resolve} from 'node:path';
import type {PXHAgent} from '../agents.js';
import {builtinSkills, builtinWorkflows} from './builtins.js';
import type {OrchestrationCatalog, PXHSkill, PXHWorkflow} from './types.js';

const maxFileBytes = 128 * 1024;
const maxItemsPerKind = 64;

export function discoverOrchestration(cwd: string): OrchestrationCatalog {
  const root = resolve(cwd);
  const projectInstructions = findProjectInstructions(root);
  const skills = discoverSkills(root);
  const workflows = discoverWorkflows(root);
  const agents = discoverAgents(root);
  return {
    projectInstructions,
    agents,
    skills: mergeById(builtinSkills, skills),
    workflows: mergeById(builtinWorkflows, workflows),
  };
}

function findProjectInstructions(cwd: string): string[] {
  const found: string[] = [];
  let current = cwd;
  for (let depth = 0; depth < 8; depth += 1) {
    const file = join(current, 'AGENTS.md');
    const content = safeRead(file);
    if (content !== undefined) found.unshift(content);
    const parent = dirname(current);
    if (parent === current || existsSync(join(current, '.git'))) break;
    current = parent;
  }
  return found;
}

function discoverSkills(root: string): PXHSkill[] {
  const directories = [
    join(root, '.pxhvibe', 'skills'), join(root, '.agents', 'skills'),
    join(root, '.opencode', 'skills'), join(root, 'skills'),
  ];
  const files = directories.flatMap((directory) => childFiles(directory, 'SKILL.md')).slice(0, maxItemsPerKind);
  return files.flatMap((file) => {
    const content = safeRead(file);
    if (content === undefined) return [];
    const {metadata, body} = parseFrontmatter(content);
    const id = slug(metadata.name ?? basename(dirname(file)));
    const name = metadata.name ?? heading(body) ?? id;
    const description = singleLine(metadata.description ?? firstParagraph(body) ?? `Skill ${name}`);
    return [{
      id, name, description, instructions: body.trim(), source: file,
      triggers: parseList(metadata.triggers ?? metadata.keywords).concat(words(id), words(description)),
    }];
  });
}

function discoverWorkflows(root: string): PXHWorkflow[] {
  const directories = [join(root, '.pxhvibe', 'workflows'), join(root, '.agents', 'workflows'), join(root, '.opencode', 'workflows'), join(root, 'workflows')];
  const files = directories.flatMap((directory) => matchingFiles(directory, /\.workflow\.md$/i)).slice(0, maxItemsPerKind);
  return files.flatMap((file) => {
    const content = safeRead(file);
    if (content === undefined) return [];
    const {metadata, body} = parseFrontmatter(content);
    const id = slug(metadata.name ?? basename(file).replace(/\.workflow\.md$/i, ''));
    const name = metadata.name ?? heading(body) ?? id;
    const description = singleLine(metadata.description ?? firstParagraph(body) ?? `Workflow ${name}`);
    const preferredAgentId = metadata.agent === undefined ? undefined : slug(metadata.agent.replace(/^pxh-/, ''));
    return [{
      id, name, description, instructions: body.trim(), source: file,
      triggers: parseList(metadata.triggers ?? metadata.keywords).concat(words(id), words(description)),
      steps: extractSteps(body), skillIds: parseList(metadata.skills),
      ...(preferredAgentId === undefined ? {} : {preferredAgentId}),
    }];
  });
}

function discoverAgents(root: string): PXHAgent[] {
  const directories = [join(root, '.pxhvibe', 'agents'), join(root, '.agents', 'agents'), join(root, '.opencode', 'agents'), join(root, 'agents')];
  const files = directories.flatMap((directory) => matchingFiles(directory, /\.md$/i)).slice(0, maxItemsPerKind);
  return files.flatMap((file) => {
    const content = safeRead(file);
    if (content === undefined) return [];
    const {metadata, body} = parseFrontmatter(content);
    const rawId = metadata.name ?? basename(file, '.md');
    const id = `project:${slug(rawId.replace(/^pxh-/, ''))}`;
    const label = heading(body) ?? rawId;
    return [{id, label, description: singleLine(metadata.description ?? firstParagraph(body) ?? label), instruction: body.trim()}];
  });
}

function childFiles(directory: string, filename: string): string[] {
  if (!isDirectory(directory)) return [];
  return readdirSync(directory, {withFileTypes: true})
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(directory, entry.name, filename))
    .filter(existsSync);
}

function matchingFiles(directory: string, pattern: RegExp): string[] {
  if (!isDirectory(directory)) return [];
  return readdirSync(directory, {withFileTypes: true})
    .filter((entry) => entry.isFile() && pattern.test(entry.name))
    .map((entry) => join(directory, entry.name));
}

function isDirectory(path: string): boolean {
  try { return statSync(path).isDirectory(); } catch { return false; }
}

function safeRead(path: string): string | undefined {
  try {
    if (statSync(path).size > maxFileBytes) return undefined;
    return readFileSync(path, 'utf8');
  } catch { return undefined; }
}

function parseFrontmatter(content: string): {metadata: Record<string, string>; body: string} {
  if (!content.startsWith('---')) return {metadata: {}, body: content};
  const end = content.indexOf('\n---', 3);
  if (end < 0) return {metadata: {}, body: content};
  const metadata: Record<string, string> = {};
  let activeKey = '';
  for (const line of content.slice(3, end).split(/\r?\n/)) {
    const match = /^([\w-]+):\s*(.*)$/.exec(line);
    if (match !== null) {
      activeKey = match[1] ?? '';
      const value = match[2] ?? '';
      metadata[activeKey] = value === '>-' || value === '|' ? '' : unquote(value);
    } else if (activeKey !== '' && /^\s+\S/.test(line)) {
      metadata[activeKey] = `${metadata[activeKey] ?? ''} ${line.trim()}`.trim();
    }
  }
  return {metadata, body: content.slice(end + 4).replace(/^\r?\n/, '')};
}

function extractSteps(body: string): string[] {
  const numbered = [...body.matchAll(/^\s*(?:\d+[.)]|[-*])\s+(.+)$/gm)].map((match) => singleLine(match[1] ?? '')).filter(Boolean);
  if (numbered.length > 0) return numbered.slice(0, 16);
  return [...body.matchAll(/^\|\s*\d+\s*\|\s*([^|]+)\|/gm)].map((match) => singleLine(match[1] ?? '')).slice(0, 16);
}

function heading(body: string): string | undefined { return /^#\s+(.+)$/m.exec(body)?.[1]?.trim(); }
function firstParagraph(body: string): string | undefined {
  return body.replace(/^#.*$/gm, '').split(/\r?\n\s*\r?\n/).map(singleLine).find((value) => value.length > 0);
}
function singleLine(value: string): string { return value.replace(/\s+/g, ' ').trim(); }
function unquote(value: string): string { return value.replace(/^['"]|['"]$/g, '').trim(); }
function parseList(value?: string): string[] {
  if (value === undefined) return [];
  return value.replace(/^\[|\]$/g, '').split(',').map((item) => slug(unquote(item))).filter(Boolean);
}
function words(value: string): string[] { return value.toLocaleLowerCase('vi').split(/[^\p{L}\p{N}]+/u).filter((word) => word.length >= 3); }
function slug(value: string): string { return value.toLocaleLowerCase('vi').trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, ''); }
function mergeById<T extends {id: string}>(base: readonly T[], additions: readonly T[]): T[] {
  const values = new Map(base.map((item) => [item.id, item]));
  for (const item of additions) values.set(item.id, item);
  return [...values.values()];
}
