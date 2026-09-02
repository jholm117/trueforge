'use client';

import type { AgentRuntimeConfig } from '../../server/types.js';
import { auiInputClass } from '../lib/inputClasses.js';
import { Switch } from '../primitives/Switch.js';

export type AgentRuntimeConfigFieldsProps = {
  value: AgentRuntimeConfig;
  sandboxAvailable: boolean;
  hasSkills: boolean;
  disabled?: boolean;
  showCapabilities?: boolean;
  layout?: 'compact' | 'detailed';
  onChange: (value: AgentRuntimeConfig) => void;
};

function parseIterationLimit(raw: string): number | null {
  if (raw.trim() === '') return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && Number.isFinite(parsed) ? Math.max(1, Math.min(1024, parsed)) : null;
}

export function AgentRuntimeConfigFields({
  value,
  sandboxAvailable,
  hasSkills,
  disabled = false,
  showCapabilities = true,
  layout = 'compact',
  onChange,
}: AgentRuntimeConfigFieldsProps) {
  const capabilityFields: Array<{
    label: string;
    description: string;
    checked: boolean;
    disabled?: boolean;
    update: (enabled: boolean) => AgentRuntimeConfig;
  }> = [
    {
      label: 'Dynamic sub-agents',
      description: 'Allow the agent to delegate complex work to focused sub-agents.',
      checked: value.dynamicSubAgents?.enabled ?? true,
      update: enabled => ({ ...value, dynamicSubAgents: { enabled } }),
    },
    {
      label: 'Generative UI',
      description: 'Allow rich interactive UI blocks in agent responses.',
      checked: value.generativeUi?.enabled ?? true,
      update: enabled => ({ ...value, generativeUi: { enabled } }),
    },
    {
      label: 'Ask user questions',
      description: 'Allow the agent to pause and ask for clarification.',
      checked: value.askUserQuestions?.enabled ?? true,
      update: enabled => ({ ...value, askUserQuestions: { enabled } }),
    },
  ];
  const runtimeFields: typeof capabilityFields = [
    {
      label: 'Sandbox',
      description: 'Provide an isolated environment for code, files, and skills.',
      checked: value.sandbox?.enabled ?? false,
      disabled: !sandboxAvailable || hasSkills,
      update: enabled => ({ ...value, sandbox: { ...value.sandbox, enabled } }),
    },
    {
      label: 'File downloads',
      description: 'Allow users to download files produced in the sandbox.',
      checked: value.sandbox?.fileDownloads ?? true,
      disabled: !sandboxAvailable || !(value.sandbox?.enabled ?? false),
      update: fileDownloads => ({
        ...value,
        sandbox: { ...value.sandbox, enabled: true, fileDownloads },
      }),
    },
    {
      label: 'Context compaction',
      description: 'Summarize older turns as the context window fills.',
      checked: value.contextManagement?.compaction?.enabled ?? true,
      update: enabled => ({
        ...value,
        contextManagement: {
          ...value.contextManagement,
          compaction: { enabled },
          largeToolResponse: value.contextManagement?.largeToolResponse ?? { enabled: true },
        },
      }),
    },
    {
      label: 'Large tool response offloading',
      description: 'Move large tool output to the sandbox and retain a preview.',
      checked: value.contextManagement?.largeToolResponse?.enabled ?? true,
      disabled: !sandboxAvailable,
      update: enabled => ({
        ...value,
        contextManagement: {
          ...value.contextManagement,
          compaction: value.contextManagement?.compaction ?? { enabled: true },
          largeToolResponse: { enabled },
        },
      }),
    },
  ];
  const switchField = (field: (typeof runtimeFields)[number], className = '') => (
    <label key={field.label} className={className || 'flex items-center justify-between gap-3 py-1.5'}>
      <span className="min-w-0">
        <span className="text-text-primary block text-xs font-medium">{field.label}</span>
        {layout === 'detailed' ? (
          <span className="text-text-secondary mt-0.5 block text-xs leading-snug">{field.description}</span>
        ) : null}
      </span>
      <Switch
        checked={field.checked}
        disabled={disabled || field.disabled}
        onCheckedChange={enabled => onChange(field.update(enabled))}
        aria-label={field.label}
      />
    </label>
  );

  if (layout === 'detailed') {
    return (
      <div className="space-y-5">
        {showCapabilities ? (
          <div className="grid gap-3 md:grid-cols-3">
            {capabilityFields.map(field =>
              switchField(field, 'flex min-h-24 items-start justify-between gap-3 rounded-lg border border-border p-3'),
            )}
          </div>
        ) : null}
        <label className="flex items-center justify-between gap-4 border-b border-border py-3">
          <span>
            <span className="text-text-primary block text-sm font-medium">Iteration limit</span>
            <span className="text-text-secondary mt-0.5 block text-xs">
              Maximum agent-loop iterations for one turn.
            </span>
          </span>
          <input
            type="number"
            min={1}
            max={1024}
            disabled={disabled}
            value={value.iterationLimit ?? 100}
            className={auiInputClass('h-8 w-24 disabled:opacity-60')}
            onChange={event => {
              const iterationLimit = parseIterationLimit(event.target.value);
              if (iterationLimit !== null) onChange({ ...value, iterationLimit });
            }}
          />
        </label>
        <div className="divide-y divide-border">
          {runtimeFields.map(field => switchField(field, 'flex items-center justify-between gap-4 py-3'))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="mb-2 block text-xs">
        <span className="text-text-secondary mb-1 block">Iteration limit</span>
        <input
          type="number"
          min={1}
          max={1024}
          disabled={disabled}
          value={value.iterationLimit ?? 100}
          className={auiInputClass('h-8 disabled:opacity-60')}
          onChange={event => {
            const iterationLimit = parseIterationLimit(event.target.value);
            if (iterationLimit !== null) onChange({ ...value, iterationLimit });
          }}
        />
      </label>
      {[...runtimeFields, ...(showCapabilities ? capabilityFields : [])].map(field => (
        <label key={field.label} className="flex items-center justify-between gap-3 py-1.5">
          <span className="text-text-primary text-xs">{field.label}</span>
          <Switch
            checked={field.checked}
            disabled={disabled || field.disabled}
            onCheckedChange={enabled => onChange(field.update(enabled))}
            aria-label={field.label}
          />
        </label>
      ))}
    </div>
  );
}

declare module '../../theme/SlotsProvider.js' {
  interface AtomSlots {
    AgentRuntimeConfigFields: typeof AgentRuntimeConfigFields;
  }
}
