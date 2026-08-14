import type {OrchestrationCatalog, OrchestrationRoute, PXHSkill, PXHWorkflow} from './types.js';

export function routeOrchestration(target: string, catalog: OrchestrationCatalog): OrchestrationRoute {
  const projectWorkflow = bestMatch(target, catalog.workflows.filter((candidate) => candidate.origin === 'project'));
  const intent = classifyWorkflowIntent(target);
  const workflow = projectWorkflow ?? (intent === undefined
    ? bestMatch(target, catalog.workflows)
    : catalog.workflows.find((candidate) => candidate.id === intent.workflowId) ?? bestMatch(target, catalog.workflows));
  const preferredSkills = workflow === undefined
    ? []
    : workflow.skillIds.flatMap((id) => catalog.skills.filter((skill) => skill.id === id));
  const matchedSkills = rankedMatches(target, catalog.skills);
  const skills = uniqueById([...preferredSkills, ...matchedSkills]).slice(0, 3);
  return {
    skills,
    ...(workflow === undefined ? {} : {workflow}),
    ...(projectWorkflow !== undefined
      ? {confidence: 1, reason: 'project workflow trigger'}
      : intent === undefined ? {} : {confidence: intent.confidence, reason: intent.reason}),
  };
}

export interface WorkflowIntent {
  workflowId: 'ai' | 'company' | 'debug' | 'game' | 'meeting' | 'release' | 'tool' | 'web';
  confidence: number;
  reason: string;
}

export function classifyWorkflowIntent(target: string): WorkflowIntent | undefined {
  const value = target.toLocaleLowerCase('vi');
  const scores = {
    debug: score(value, [/\b(?:bug|debug|crash|exception|error|stack trace)\b/g, /\blỗi\b/g, /không (?:hoạt động|phản hồi)/g], 5),
    release: score(value, [/\b(?:release|publish|deploy|shipping)\b/g, /phát hành|đóng gói/g], 5),
    meeting: score(value, [/\b(?:meeting|brainstorm|workshop)\b/g, /họp|thảo luận|làm rõ yêu cầu/g], 5),
    game: score(value, [/\b(?:game|gameplay|player|enemy|enemies|boss|platformer|shooter|rpg|phaser|godot|unity|sprite|level)\b/g, /trò chơi|màn chơi|nhân vật|kẻ địch/g], 4),
    ai: score(value, [/\b(?:llm|rag|chatbot|embedding|vector search|machine learning|ai agent)\b/g, /trí tuệ nhân tạo/g], 4),
    tool: score(value, [/\b(?:cli|command line|vscode extension|code generator|automation tool)\b/g, /công cụ dòng lệnh|tiện ích vscode/g], 4),
    web: score(value, [/\b(?:website|web app|landing page|dashboard|ecommerce|frontend|backend|react|next\.js)\b/g, /trang web|ứng dụng web/g], 3),
  };

  // Task lifecycle intents must win over the product domain: "fix game crash"
  // is a Debug workflow enriched with game skills, not a new Game build.
  for (const workflowId of ['debug', 'release', 'meeting'] as const) {
    if (scores[workflowId] >= 5) return intent(workflowId, scores[workflowId], `task intent: ${workflowId}`);
  }

  // Domain terms such as gameplay/player/enemy are more specific than delivery
  // terms such as web/UI. This prevents an HTML5 game specification routing to Web.
  const domains = (['game', 'ai', 'tool', 'web'] as const)
    .map((workflowId) => ({workflowId, value: scores[workflowId]}))
    .filter(({value: domainScore}) => domainScore >= 3)
    .sort((left, right) => right.value - left.value);
  const winner = domains[0];
  if (winner !== undefined) return intent(winner.workflowId, winner.value, `domain signals: ${winner.workflowId}`);

  if (/(?:\b(?:build|create|implement|make)\b|\b(?:làm|tạo|xây|triển khai|thêm)\b)/u.test(value)) {
    return {workflowId: 'company', confidence: 0.7, reason: 'general build intent'};
  }
  return undefined;
}

function bestMatch<T extends PXHWorkflow | PXHSkill>(target: string, items: readonly T[]): T | undefined {
  return ranked(target, items)[0]?.item;
}

function rankedMatches<T extends PXHWorkflow | PXHSkill>(target: string, items: readonly T[]): T[] {
  return ranked(target, items).filter((entry) => entry.score > 0).map((entry) => entry.item);
}

function ranked<T extends PXHWorkflow | PXHSkill>(target: string, items: readonly T[]): Array<{item: T; score: number}> {
  const normalized = target.toLocaleLowerCase('vi');
  return items
    .map((item) => ({item, score: item.triggers.reduce((sum, trigger) => sum + triggerScore(normalized, trigger), 0)}))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);
}

function triggerScore(target: string, trigger: string): number {
  const normalized = trigger.toLocaleLowerCase('vi').trim();
  if (normalized.length < 2 || !target.includes(normalized)) return 0;
  return normalized.includes(' ') ? 4 : normalized.length >= 6 ? 2 : 1;
}

function score(value: string, patterns: readonly RegExp[], weight: number): number {
  return patterns.reduce((total, pattern) => total + [...value.matchAll(pattern)].length * weight, 0);
}

function intent(workflowId: WorkflowIntent['workflowId'], value: number, reason: string): WorkflowIntent {
  return {workflowId, confidence: Math.min(0.99, 0.72 + value / 100), reason};
}

function uniqueById<T extends {id: string}>(items: readonly T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}
