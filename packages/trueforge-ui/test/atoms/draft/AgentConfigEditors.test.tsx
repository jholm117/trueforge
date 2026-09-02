// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { AgentConfigEditors } from '@/atoms/draft/AgentConfigEditors.js';
import type { AgentSpec } from '@/server/types.js';
import { SlotsProvider } from '@/theme/SlotsProvider.js';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

describe('AgentConfigEditors', () => {
  it('hides the model cost column when pricing is unavailable', () => {
    render(
      <SlotsProvider>
        <AgentConfigEditors
          editor="model"
          spec={{ model: { name: 'openai/gpt' } }}
          models={[
            {
              id: 'openai/gpt',
              name: 'openai/gpt',
              provider: { name: 'OpenAI' },
              properties: { contextLength: 128_000 },
            },
          ]}
          connectors={[]}
          skills={[]}
          loading={false}
          error={null}
          onChange={vi.fn()}
          onClose={vi.fn()}
        />
      </SlotsProvider>,
    );

    expect(screen.getByText('Context')).toBeInTheDocument();
    expect(screen.queryByText('Cost / 1M')).not.toBeInTheDocument();
  });

  it('uses toggles and sliders for model settings', () => {
    const spec: AgentSpec = { model: { name: 'openai/gpt' } };
    const onChange = vi.fn();
    render(
      <SlotsProvider>
        <AgentConfigEditors
          editor="model-settings"
          spec={spec}
          models={[
            {
              id: 'openai/gpt',
              name: 'openai/gpt',
              provider: { name: 'OpenAI' },
              properties: { maxOutputTokens: 8_192 },
            },
          ]}
          connectors={[]}
          skills={[]}
          loading={false}
          error={null}
          onChange={onChange}
          onClose={vi.fn()}
        />
      </SlotsProvider>,
    );

    fireEvent.click(screen.getByRole('switch', { name: 'Enable Maximum Tokens' }));
    expect(onChange).toHaveBeenCalledWith({
      ...spec,
      model: { ...spec.model, params: { maxTokens: 2500 } },
    });
    expect(screen.getByRole('button', { name: 'JSON' })).toBeInTheDocument();
  });

  it('opens runtime configuration in a dedicated modal', () => {
    const spec: AgentSpec = { model: { name: 'openai/gpt' } };
    render(
      <SlotsProvider>
        <AgentConfigEditors
          editor="runtime"
          spec={spec}
          models={[]}
          connectors={[]}
          skills={[]}
          loading={false}
          error={null}
          sandboxAvailable
          onChange={vi.fn()}
          onClose={vi.fn()}
        />
      </SlotsProvider>,
    );

    expect(screen.getByRole('dialog', { name: 'Runtime Config' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Context compaction' })).toBeInTheDocument();
  });

  it('loads MCP tools lazily and preserves unrelated mount selectors', async () => {
    const spec: AgentSpec = {
      model: { name: 'openai/gpt' },
      mcpServers: [
        {
          id: 'github',
          name: 'GitHub',
          enableTools: ['@all'],
          requireApprovalForTools: ['@write'],
        },
      ],
    };
    const onChange = vi.fn();
    const loadMcpTools = vi.fn(async () => [
      { id: 'issues.list', name: 'issues.list', description: 'List issues' },
      { id: 'pulls.list', name: 'pulls.list', description: 'List pull requests' },
    ]);

    render(
      <SlotsProvider>
        <AgentConfigEditors
          editor="mcp"
          spec={spec}
          models={[]}
          connectors={[{ id: 'github', name: 'GitHub', authenticated: true }]}
          skills={[]}
          loading={false}
          error={null}
          loadMcpTools={loadMcpTools}
          onChange={onChange}
          onClose={vi.fn()}
        />
      </SlotsProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Configure GitHub tools' }));
    await waitFor(() => expect(loadMcpTools).toHaveBeenCalledWith('github'));
    const issueRows = await screen.findAllByRole('menuitemcheckbox', { name: /issues.list/ });
    const availableIssueRow = issueRows[0];
    if (availableIssueRow === undefined) throw new Error('expected available issue tool row');
    fireEvent.click(availableIssueRow);

    expect(onChange).toHaveBeenLastCalledWith({
      ...spec,
      mcpServers: [
        {
          id: 'github',
          name: 'GitHub',
          enableTools: ['pulls.list'],
          requireApprovalForTools: ['@write'],
        },
      ],
    });
  });

  it('clears stale tools and falls back when the active connector is removed', async () => {
    const githubSpec: AgentSpec = {
      model: { name: 'openai/gpt' },
      mcpServers: [{ id: 'github', name: 'GitHub' }],
    };
    const slackSpec: AgentSpec = {
      model: { name: 'openai/gpt' },
      mcpServers: [{ id: 'slack', name: 'Slack' }],
    };
    let resolveSlack: ((tools: Array<{ id: string; name: string; description: string }>) => void) | undefined;
    const slackTools = new Promise<Array<{ id: string; name: string; description: string }>>(resolve => {
      resolveSlack = resolve;
    });
    const loadMcpTools = vi.fn((connectorId: string) =>
      connectorId === 'github'
        ? Promise.resolve([{ id: 'issues.list', name: 'issues.list', description: 'List issues' }])
        : slackTools,
    );
    const renderEditors = (spec: AgentSpec) => (
      <SlotsProvider>
        <AgentConfigEditors
          editor="mcp"
          spec={spec}
          models={[]}
          connectors={[
            { id: 'github', name: 'GitHub', authenticated: true },
            { id: 'slack', name: 'Slack', authenticated: true },
          ]}
          skills={[]}
          loading={false}
          error={null}
          loadMcpTools={loadMcpTools}
          onChange={vi.fn()}
          onClose={vi.fn()}
        />
      </SlotsProvider>
    );
    const rendered = render(renderEditors(githubSpec));

    expect((await screen.findAllByRole('menuitemcheckbox', { name: /issues.list/ })).length).toBeGreaterThan(0);
    rendered.rerender(renderEditors(slackSpec));

    await waitFor(() => expect(loadMcpTools).toHaveBeenLastCalledWith('slack'));
    expect(screen.queryByRole('menuitemcheckbox', { name: /issues.list/ })).not.toBeInTheDocument();

    if (resolveSlack === undefined) throw new Error('expected Slack tools resolver');
    resolveSlack([{ id: 'messages.list', name: 'messages.list', description: 'List messages' }]);
    expect((await screen.findAllByRole('menuitemcheckbox', { name: /messages.list/ })).length).toBeGreaterThan(0);
  });

  it('enables sandbox when a skill is added', () => {
    const spec: AgentSpec = { model: { name: 'openai/gpt' } };
    const onChange = vi.fn();

    render(
      <SlotsProvider>
        <AgentConfigEditors
          editor="skills"
          spec={spec}
          models={[]}
          connectors={[]}
          skills={[{ id: 'research', name: 'Research' }]}
          loading={false}
          error={null}
          onChange={onChange}
          onClose={vi.fn()}
        />
      </SlotsProvider>,
    );

    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /Research/ }));
    expect(onChange).toHaveBeenCalledWith({
      ...spec,
      skills: [{ id: 'research', name: 'Research' }],
      config: { sandbox: { enabled: true } },
    });
  });
});
