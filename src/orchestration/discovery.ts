import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {basename, dirname, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import type {PXHAgent} from '../agents.js';
import {builtinSkills, builtinWorkflows} from './builtins.js';
import type {OrchestrationCatalog, PXHSkill, PXHWorkflow} from './types.js';

const maxFileBytes = 128 * 1024;
const maxItemsPerKind = 64;

export function discoverOrchestration(cwd: string): OrchestrationCatalog {
  const root = resolve(cwd);
  const bundledRoot = resolveBundledResourcesRoot();
  const bundledRules = safeRead(join(bundledRoot, '_shared', 'core-rules.md'));
  const projectInstructions = [...(bundledRules === undefined ? [] : [bundledRules]), ...findProjectInstructions(root)];
  const bundledSkills = discoverSkills(bundledRoot, 'bundled');
  const projectSkills = discoverSkills(root, 'project');
  const bundledWorkflows = discoverWorkflows(bundledRoot, 'bundled');
  const projectWorkflows = discoverWorkflows(root, 'project');
  const bundledAgents = discoverAgents(bundledRoot, 'bundled');
  const projectAgents = discoverAgents(root, 'project');
  return {
    projectInstructions,
    agents: mergeById(bundledAgents, projectAgents),
    skills: mergeSkills(builtinSkills, bundledSkills, projectSkills),
    workflows: mergeWorkflows(builtinWorkflows, bundledWorkflows, projectWorkflows),
  };
}

export function resolveBundledResourcesRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'resources');
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

function discoverSkills(root: string, origin: PXHSkill['origin']): PXHSkill[] {
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
      id, name, description, instructions: expandReferences(body.trim(), file, root), source: file, origin,
      triggers: parseList(metadata.triggers ?? metadata.keywords).concat(words(id), words(description)),
    }];
  });
}

function discoverWorkflows(root: string, origin: PXHWorkflow['origin']): PXHWorkflow[] {
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
      id, name, description, instructions: body.trim(), source: file, origin,
      triggers: parseList(metadata.triggers ?? metadata.keywords).concat(words(id), words(description)),
      steps: extractSteps(body), skillIds: parseList(metadata.skills),
      ...(preferredAgentId === undefined ? {} : {preferredAgentId}),
    }];
  });
}

function discoverAgents(root: string, origin: 'bundled' | 'project'): PXHAgent[] {
  const directories = [join(root, '.pxhvibe', 'agents'), join(root, '.agents', 'agents'), join(root, '.opencode', 'agents'), join(root, 'agents')];
  const files = directories.flatMap((directory) => matchingFiles(directory, /\.md$/i)).slice(0, maxItemsPerKind);
  return files.flatMap((file) => {
    const content = safeRead(file);
    if (content === undefined) return [];
    const {metadata, body} = parseFrontmatter(content);
    const rawId = metadata.name ?? basename(file, '.md');
    const normalizedId = slug(rawId.replace(/^pxh-/, ''));
    const id = origin === 'bundled' ? bundledAgentId(normalizedId) : `project:${normalizedId}`;
    const label = heading(body) ?? rawId;
    return [{id, label, description: singleLine(metadata.description ?? firstParagraph(body) ?? label), instruction: body.trim()}];
  });
}

function bundledAgentId(id: string): string {
  if (id === 'pm') return 'auto';
  if (id === 'save-history') return 'save-history';
  return id;
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

function expandReferences(body: string, sourceFile: string, root: string): string {
  const matches = [...body.matchAll(/`([\p{L}\p{N}_./-]+\.(?:md|ts|tsx|js|mjs|json|ps1|html|css))`/gu)];
  const additions: string[] = [];
  let addedCharacters = 0;
  for (const match of matches.slice(0, 3)) {
    const reference = match[1];
    if (reference === undefined) continue;
    const candidate = /^(?:skills|workflows|_shared)\//.test(reference)
      ? resolve(root, reference)
      : resolve(dirname(sourceFile), reference);
    if (!isInsideRoot(root, candidate)) continue;
    const content = safeRead(candidate);
    if (content === undefined || addedCharacters + content.length > 20_000) continue;
    additions.push(`\n\n---\nREFERENCED RESOURCE: ${relative(root, candidate)}\n\n${content.trim()}`);
    addedCharacters += content.length;
  }
  return `${body}${additions.join('')}`;
}

function isInsideRoot(root: string, candidate: string): boolean {
  const normalizedRoot = resolve(root);
  const normalizedCandidate = resolve(candidate);
  return normalizedCandidate === normalizedRoot || normalizedCandidate.startsWith(`${normalizedRoot}${sep}`);
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

function mergeSkills(...catalogs: ReadonlyArray<readonly PXHSkill[]>): PXHSkill[] {
  const values = new Map<string, PXHSkill>();
  for (const catalog of catalogs) {
    for (const item of catalog) {
      const existing = values.get(item.id);
      values.set(item.id, existing === undefined ? item : {
        ...item,
        name: item.origin === 'bundled' ? existing.name : item.name,
        triggers: [...new Set([...existing.triggers, ...item.triggers])],
      });
    }
  }
  return [...values.values()];
}

function mergeWorkflows(...catalogs: ReadonlyArray<readonly PXHWorkflow[]>): PXHWorkflow[] {
  const values = new Map<string, PXHWorkflow>();
  for (const catalog of catalogs) {
    for (const item of catalog) {
      const existing = values.get(item.id);
      if (existing === undefined) {
        values.set(item.id, item);
        continue;
      }
      values.set(item.id, {
        ...existing,
        ...item,
        name: item.origin === 'bundled' ? existing.name : item.name,
        triggers: [...new Set([...existing.triggers, ...item.triggers])],
        steps: item.steps.length === 0 ? existing.steps : item.steps,
        skillIds: item.skillIds.length === 0 ? existing.skillIds : item.skillIds,
        ...(item.preferredAgentId === undefined && existing.preferredAgentId !== undefined
          ? {preferredAgentId: existing.preferredAgentId}
          : {}),
      });
    }
  }
  return [...values.values()];
}
