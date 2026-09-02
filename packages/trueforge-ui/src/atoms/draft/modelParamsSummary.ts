import type { ModelParams } from '../../server/types.js';

export type ModelParamSummaryEntry = {
  label: string;
  value: string;
};

export function modelParamSummary(params?: ModelParams): ModelParamSummaryEntry[] {
  if (!params) return [];
  const entries: ModelParamSummaryEntry[] = [];
  if (params.maxTokens !== undefined) entries.push({ label: 'max tokens', value: String(params.maxTokens) });
  if (params.reasoningEffort !== undefined) entries.push({ label: 'reasoning effort', value: params.reasoningEffort });
  if (params.temperature !== undefined) entries.push({ label: 'temperature', value: String(params.temperature) });
  if (params.topP !== undefined) entries.push({ label: 'top-p', value: String(params.topP) });
  if (params.topK !== undefined) entries.push({ label: 'top-k', value: String(params.topK) });
  if (params.parallelToolCalls !== undefined) {
    entries.push({ label: 'parallel tool calls', value: params.parallelToolCalls ? 'on' : 'off' });
  }
  return entries;
}
