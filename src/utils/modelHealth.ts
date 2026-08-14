import type {PXHMode} from '../modes.js';
import type {AIProvider} from '../providers/AIProvider.js';
import {OpenCodeProvider} from '../providers/OpenCodeProvider.js';

export interface ModelHealthResult {
  modeId: string;
  ok: boolean;
  latencyMs: number;
}

export interface ModelHealthReport {
  checkedAt: number;
  results: readonly ModelHealthResult[];
  recommendedModeId?: string;
}

type ProbeFactory = (model: string) => AIProvider;

export async function checkFreeModelHealth(
  catalog: readonly PXHMode[],
  cwd: string,
  createProbe: ProbeFactory = (model) => new OpenCodeProvider(model, 30_000),
): Promise<ModelHealthReport> {
  const freeModes = catalog.filter((mode) => mode.provider === 'free' && mode.model !== undefined);
  const results = await Promise.all(freeModes.map(async (mode): Promise<ModelHealthResult> => {
    const started = Date.now();
    const provider = createProbe(mode.model!);
    try {
      await provider.sendMessage('Chỉ trả lời đúng một từ: OK. Không dùng tool.', {cwd});
      return {modeId: mode.id, ok: true, latencyMs: Date.now() - started};
    } catch {
      return {modeId: mode.id, ok: false, latencyMs: Date.now() - started};
    } finally {
      provider.cancel();
    }
  }));
  const recommended = results
    .filter((result) => result.ok)
    .sort((left, right) => left.latencyMs - right.latencyMs)[0];
  return {
    checkedAt: Date.now(),
    results,
    ...(recommended === undefined ? {} : {recommendedModeId: recommended.modeId}),
  };
}

export function isModelHealthFresh(report: ModelHealthReport | undefined, now = Date.now()): boolean {
  return report !== undefined && now - report.checkedAt < 10 * 60_000;
}
