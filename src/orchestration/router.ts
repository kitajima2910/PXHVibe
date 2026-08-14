import type {OrchestrationCatalog, OrchestrationRoute, PXHSkill, PXHWorkflow} from './types.js';

export function routeOrchestration(target: string, catalog: OrchestrationCatalog): OrchestrationRoute {
  const workflow = bestMatch(target, catalog.workflows);
  const preferredSkills = workflow === undefined
    ? []
    : workflow.skillIds.flatMap((id) => catalog.skills.filter((skill) => skill.id === id));
  const matchedSkills = rankedMatches(target, catalog.skills);
  const skills = uniqueById([...preferredSkills, ...matchedSkills]).slice(0, 3);
  return {skills, ...(workflow === undefined ? {} : {workflow})};
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

function uniqueById<T extends {id: string}>(items: readonly T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}
