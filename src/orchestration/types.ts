import type {PXHAgent} from '../agents.js';

export interface PXHSkill {
  id: string;
  name: string;
  description: string;
  instructions: string;
  triggers: readonly string[];
  source: string;
}

export interface PXHWorkflow {
  id: string;
  name: string;
  description: string;
  instructions: string;
  triggers: readonly string[];
  steps: readonly string[];
  preferredAgentId?: string;
  skillIds: readonly string[];
  source: string;
}

export interface OrchestrationCatalog {
  projectInstructions: readonly string[];
  agents: readonly PXHAgent[];
  skills: readonly PXHSkill[];
  workflows: readonly PXHWorkflow[];
}

export interface OrchestrationRoute {
  workflow?: PXHWorkflow;
  skills: readonly PXHSkill[];
}
