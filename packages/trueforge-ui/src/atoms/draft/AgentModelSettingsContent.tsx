'use client';

import { useState, type ReactNode } from 'react';

import type { AgentSpec, ModelParams, ModelSelection } from '../../server/types.js';
import { cn } from '../lib/cn.js';
import { auiInputClass } from '../lib/inputClasses.js';
import { Switch } from '../primitives/Switch.js';

export type AgentModelSettingsContentProps = {
  spec: AgentSpec;
  model?: ModelSelection;
  onChange: (spec: AgentSpec) => void;
};

function isModelParams(value: unknown): value is ModelParams {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const numericKeys = ['maxTokens', 'temperature', 'topP', 'topK'];
  for (const key of numericKeys) {
    const field = Reflect.get(value, key);
    if (field !== undefined && (typeof field !== 'number' || !Number.isFinite(field))) return false;
  }
  const reasoningEffort = Reflect.get(value, 'reasoningEffort');
  if (reasoningEffort !== undefined && typeof reasoningEffort !== 'string') return false;
  const parallelToolCalls = Reflect.get(value, 'parallelToolCalls');
  return parallelToolCalls === undefined || typeof parallelToolCalls === 'boolean';
}

function finiteNumber(raw: string): number | null {
  if (raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function AgentModelSettingsContent({ spec, model, onChange }: AgentModelSettingsContentProps) {
  const [view, setView] = useState<'ui' | 'json'>('ui');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const params = spec.model.params ?? {};
  const json = JSON.stringify(params, null, 2);

  const replaceParams = (next: ModelParams) => onChange({ ...spec, model: { ...spec.model, params: next } });
  const setParam = <Key extends keyof ModelParams>(key: Key, value: ModelParams[Key]) =>
    replaceParams({ ...params, [key]: value });
  const removeParam = (key: keyof ModelParams) => {
    const next = { ...params };
    delete next[key];
    replaceParams(next);
  };
  const viewToggle = (
    <div className="flex rounded-md border border-border p-0.5 text-xs font-medium">
      {(['ui', 'json'] as const).map(option => (
        <button
          key={option}
          type="button"
          aria-pressed={view === option}
          className={cn(
            'rounded px-2 py-1 uppercase',
            view === option && 'bg-primary-button-bg text-primary-button-text',
          )}
          onClick={() => setView(option)}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );

  if (view === 'json') {
    return (
      <div className="w-full p-5">
        <div className="mb-4 flex justify-end">{viewToggle}</div>
        <textarea
          key={json}
          defaultValue={json}
          rows={16}
          aria-label="Model parameters JSON"
          className={auiInputClass('font-mono text-xs')}
          onChange={event => {
            try {
              const parsed: unknown = JSON.parse(event.target.value);
              if (!isModelParams(parsed)) {
                setJsonError('Parameters must be an object with valid parameter values.');
                return;
              }
              setJsonError(null);
              replaceParams(parsed);
            } catch {
              setJsonError('Enter valid JSON.');
            }
          }}
        />
        {jsonError ? <p className="text-failure-bg mt-2 text-xs">{jsonError}</p> : null}
      </div>
    );
  }

  const maxOutput = model?.properties.maxOutputTokens ?? 128_000;
  const rows: Array<{
    label: string;
    enabled: boolean;
    control: ReactNode;
    onToggle: (enabled: boolean) => void;
  }> = [
    {
      label: 'Maximum Tokens',
      enabled: params.maxTokens !== undefined,
      onToggle: enabled => (enabled ? setParam('maxTokens', Math.min(2500, maxOutput)) : removeParam('maxTokens')),
      control: (
        <div className="mt-2 flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={maxOutput}
            value={params.maxTokens ?? Math.min(2500, maxOutput)}
            disabled={params.maxTokens === undefined}
            aria-label="Maximum tokens slider"
            className="min-w-0 flex-1 accent-primary-button-bg"
            onChange={event => {
              const value = finiteNumber(event.target.value);
              if (value !== null) setParam('maxTokens', value);
            }}
          />
          <input
            type="number"
            min={1}
            max={maxOutput}
            value={params.maxTokens ?? Math.min(2500, maxOutput)}
            disabled={params.maxTokens === undefined}
            aria-label="Maximum tokens value"
            className={auiInputClass('h-8 w-24')}
            onChange={event => {
              const value = finiteNumber(event.target.value);
              if (value !== null) setParam('maxTokens', Math.max(1, Math.min(maxOutput, value)));
            }}
          />
        </div>
      ),
    },
    {
      label: 'Reasoning Effort',
      enabled: params.reasoningEffort !== undefined,
      onToggle: enabled =>
        enabled
          ? setParam('reasoningEffort', model?.properties.reasoningEfforts?.[0] ?? 'medium')
          : removeParam('reasoningEffort'),
      control: model?.properties.reasoningEfforts?.length ? (
        <select
          value={params.reasoningEffort ?? ''}
          disabled={params.reasoningEffort === undefined}
          aria-label="Reasoning effort value"
          className={auiInputClass('mt-2')}
          onChange={event => setParam('reasoningEffort', event.target.value)}
        >
          {model.properties.reasoningEfforts.map(effort => (
            <option key={effort} value={effort}>
              {effort}
            </option>
          ))}
        </select>
      ) : null,
    },
    {
      label: 'Temperature',
      enabled: params.temperature !== undefined,
      onToggle: enabled => (enabled ? setParam('temperature', 0.7) : removeParam('temperature')),
      control: (
        <div className="mt-2 flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={params.temperature ?? 0.7}
            disabled={params.temperature === undefined}
            aria-label="Temperature slider"
            className="min-w-0 flex-1 accent-primary-button-bg"
            onChange={event => {
              const value = finiteNumber(event.target.value);
              if (value !== null) setParam('temperature', value);
            }}
          />
          <span className="text-text-secondary w-10 text-right text-xs">{params.temperature ?? 0.7}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full p-5">
      <div className="mb-3 flex justify-end">{viewToggle}</div>
      <div className="divide-y divide-border">
        {rows.map(row => (
          <div key={row.label} className="py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-text-primary text-sm font-medium">{row.label}</span>
              <Switch checked={row.enabled} onCheckedChange={row.onToggle} aria-label={`Enable ${row.label}`} />
            </div>
            {row.control}
          </div>
        ))}
      </div>
      <details className="border-t border-border py-3">
        <summary className="text-text-primary cursor-pointer text-sm font-semibold">Other Parameters</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(['topP', 'topK'] as const).map(key => (
            <label key={key} className="text-text-primary text-xs">
              {key === 'topP' ? 'Top-p' : 'Top-k'}
              <input
                type="number"
                value={params[key] ?? ''}
                className={auiInputClass('mt-1')}
                onChange={event => {
                  const value = finiteNumber(event.target.value);
                  if (value === null) removeParam(key);
                  else setParam(key, value);
                }}
              />
            </label>
          ))}
          <label className="text-text-primary flex items-center justify-between gap-2 text-xs sm:col-span-2">
            Parallel tool calls
            <Switch
              checked={params.parallelToolCalls ?? true}
              onCheckedChange={enabled => setParam('parallelToolCalls', enabled)}
              aria-label="Parallel tool calls"
            />
          </label>
        </div>
      </details>
    </div>
  );
}

declare module '../../theme/SlotsProvider.js' {
  interface AtomSlots {
    AgentModelSettingsContent: typeof AgentModelSettingsContent;
  }
}
