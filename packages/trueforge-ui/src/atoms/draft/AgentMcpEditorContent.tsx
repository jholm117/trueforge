'use client';

import { useState } from 'react';

import { Icon } from '../../icons/Icon.js';
import type { AgentSpec, ConnectorState, McpToolSelection } from '../../server/types.js';
import { useSlot } from '../../theme/SlotsProvider.js';
import { auiButtonClass } from '../lib/buttonClasses.js';
import { auiInputClass } from '../lib/inputClasses.js';
import { Switch } from '../primitives/Switch.js';
import { isUnauthenticatedDcrConnector } from './DraftCompositeSelector.js';
import { editableMountsFromSpec, enabledToolsFromMount, withEnabledTools, withPreload } from './agentConfigMounts.js';

export type AgentMcpEditorContentProps = {
  spec: AgentSpec;
  connectors: ConnectorState[];
  query: string;
  activeConnectorId: string | null;
  tools: McpToolSelection[];
  toolsLoading: boolean;
  toolsError: string | null;
  onQueryChange: (query: string) => void;
  onSelectConnector: (connectorId: string) => void;
  onRetryTools: () => void;
  onRefreshConnectors?: () => Promise<void>;
  onChange: (spec: AgentSpec) => void;
};

export function AgentMcpEditorContent({
  spec,
  connectors,
  query,
  activeConnectorId,
  tools,
  toolsLoading,
  toolsError,
  onQueryChange,
  onSelectConnector,
  onRetryTools,
  onRefreshConnectors,
  onChange,
}: AgentMcpEditorContentProps) {
  const CatalogRow = useSlot('CatalogRow');
  const ConnectorConnectButton = useSlot('ConnectorConnectButton');
  const [toolQuery, setToolQuery] = useState('');
  const mcpMounts = editableMountsFromSpec(spec.mcpServers);
  const selectedConnector = connectors.find(item => item.id === activeConnectorId);
  const activeMount = selectedConnector
    ? mcpMounts.find(item => item.id === selectedConnector.id || item.name === selectedConnector.name)
    : undefined;
  const enabledTools = activeMount ? enabledToolsFromMount(activeMount.value) : 'all';
  const normalizedQuery = query.trim().toLowerCase();
  const filteredConnectors = connectors
    .filter(item => `${item.name} ${item.description ?? ''}`.toLowerCase().includes(normalizedQuery))
    .sort((left, right) => {
      const leftSelected = mcpMounts.some(item => item.id === left.id || item.name === left.name);
      const rightSelected = mcpMounts.some(item => item.id === right.id || item.name === right.name);
      return Number(rightSelected) - Number(leftSelected);
    });
  const filteredTools = tools.filter(tool =>
    `${tool.name} ${tool.description ?? ''}`.toLowerCase().includes(toolQuery.trim().toLowerCase()),
  );
  const selectedTools = enabledTools === 'all' ? tools : tools.filter(tool => enabledTools.includes(tool.name));

  const updateMount = (value: object) => {
    if (!activeMount) return;
    onChange({
      ...spec,
      mcpServers: mcpMounts.map(item => (item === activeMount ? value : item.value)),
    });
  };

  const toggleTool = (toolName: string) => {
    if (!activeMount) return;
    const current = enabledTools === 'all' ? tools.map(tool => tool.name) : enabledTools;
    const checked = current.includes(toolName);
    updateMount(
      withEnabledTools(activeMount.value, checked ? current.filter(name => name !== toolName) : [...current, toolName]),
    );
  };

  return (
    <div className="grid h-[min(36rem,calc(100dvh-8rem))] w-full min-w-0 grid-cols-1 overflow-hidden md:grid-cols-[14rem_minmax(0,1fr)_14rem]">
      <div className="flex min-h-0 min-w-0 flex-col border-r border-border">
        <label className="relative m-3 block shrink-0">
          <Icon name="search" className="text-text-secondary absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
          <input
            value={query}
            onChange={event => onQueryChange(event.target.value)}
            placeholder="Search MCP"
            className={auiInputClass('w-full pl-7')}
          />
        </label>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {filteredConnectors.map(connector => {
            const mount = mcpMounts.find(item => item.id === connector.id || item.name === connector.name);
            const needsConnect = isUnauthenticatedDcrConnector(connector);
            return (
              <CatalogRow
                key={connector.id}
                title={connector.name}
                description={connector.description}
                checked={mount !== undefined}
                disabled={!connector.authenticated && !needsConnect && mount === undefined}
                onToggle={() => {
                  if (mount === undefined) {
                    onChange({
                      ...spec,
                      mcpServers: [...(spec.mcpServers ?? []), { id: connector.id, name: connector.name }],
                    });
                    onSelectConnector(connector.id);
                  } else {
                    onChange({
                      ...spec,
                      mcpServers: mcpMounts.filter(item => item !== mount).map(item => item.value),
                    });
                  }
                }}
                action={
                  needsConnect && onRefreshConnectors ? (
                    <ConnectorConnectButton connector={connector} onConnected={onRefreshConnectors} />
                  ) : mount ? (
                    <button
                      type="button"
                      className={auiButtonClass({ variant: 'ghost', size: 'icon', className: 'size-7' })}
                      aria-label={`Configure ${connector.name} tools`}
                      onClick={event => {
                        event.stopPropagation();
                        onSelectConnector(connector.id);
                      }}
                    >
                      <Icon name="chevron-right" className="size-3.5" />
                    </button>
                  ) : undefined
                }
              />
            );
          })}
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-col border-r border-border">
        {selectedConnector && activeMount ? (
          <>
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border p-3">
              <p className="min-w-0 truncate text-sm font-semibold">
                {selectedConnector.name} Tools ({tools.length})
              </p>
              <label className="text-text-secondary flex shrink-0 items-center gap-2 text-xs">
                Enable all tools
                <Switch
                  checked={enabledTools === 'all'}
                  onCheckedChange={enabled => updateMount(withEnabledTools(activeMount.value, enabled ? 'all' : []))}
                  aria-label="Enable all tools"
                />
              </label>
            </div>
            <label className="relative m-3 block shrink-0">
              <Icon name="search" className="text-text-secondary absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
              <input
                value={toolQuery}
                onChange={event => setToolQuery(event.target.value)}
                placeholder="Search tools"
                className={auiInputClass('w-full pl-7')}
              />
            </label>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
              {toolsLoading ? <p className="text-text-secondary p-3 text-sm">Loading tools…</p> : null}
              {toolsError ? (
                <div className="p-3">
                  <p className="text-failure-bg text-sm">{toolsError}</p>
                  <button
                    type="button"
                    className={auiButtonClass({ variant: 'secondary', size: 'sm', className: 'mt-2' })}
                    onClick={onRetryTools}
                  >
                    Retry
                  </button>
                </div>
              ) : null}
              {filteredTools.map(tool => (
                <CatalogRow
                  key={tool.id}
                  title={tool.name}
                  description={tool.description}
                  checked={enabledTools === 'all' || enabledTools.includes(tool.name)}
                  onToggle={() => toggleTool(tool.name)}
                />
              ))}
            </div>
            <label className="text-text-secondary flex shrink-0 items-center justify-end gap-2 border-t border-border p-3 text-xs">
              Preload tools
              <Switch
                checked={Reflect.get(activeMount.value, 'preload') === true}
                onCheckedChange={preload => updateMount(withPreload(activeMount.value, preload))}
                aria-label="Preload tools"
              />
            </label>
          </>
        ) : (
          <p className="text-text-secondary p-4 text-sm">Select an MCP server to configure its tools.</p>
        )}
      </div>

      <div className="flex min-h-0 min-w-0 flex-col">
        <div className="shrink-0 border-b border-border p-3 text-sm font-semibold">
          Selected Tools ({selectedTools.length})
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {selectedTools.length ? (
            selectedTools.map(tool => (
              <CatalogRow
                key={tool.id}
                title={tool.name}
                description={tool.description}
                checked
                onToggle={() => toggleTool(tool.name)}
              />
            ))
          ) : (
            <p className="text-text-secondary p-4 text-center text-sm">No tools selected.</p>
          )}
        </div>
      </div>
    </div>
  );
}

declare module '../../theme/SlotsProvider.js' {
  interface AtomSlots {
    AgentMcpEditorContent: typeof AgentMcpEditorContent;
  }
}
