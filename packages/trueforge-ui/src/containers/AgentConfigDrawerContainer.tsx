'use client';

import {
  useTrueFoundryAgentSpec,
  useTrueFoundryFlushAgentSpec,
  useTrueFoundryUpdateAgentSpec,
} from '@truefoundry/assistant-ui-runtime';
import { useCallback, useEffect, useState } from 'react';

import type { AgentConfigEditor } from '../atoms/draft/AgentConfigEditors.js';
import { useDraftCatalog } from '../atoms/draft/DraftCatalogProvider.js';
import { useDebouncedAgentInstructions } from '../hooks/useDebouncedAgentInstructions.js';
import { useOptionalServer, useServerCapabilities } from '../server/ServerContext.js';
import { useShellMode } from '../server/ShellModeContext.js';
import type { AgentSpec, McpToolSelection } from '../server/types.js';
import { useSlot } from '../theme/SlotsProvider.js';

export function AgentConfigDrawerContainer() {
  const { agentSpec } = useTrueFoundryAgentSpec();
  const updateAgentSpec = useTrueFoundryUpdateAgentSpec();
  const flushAgentSpec = useTrueFoundryFlushAgentSpec();
  const shell = useShellMode();
  const server = useOptionalServer();
  const capabilities = useServerCapabilities();
  const catalog = useDraftCatalog();
  const AgentConfigPanel = useSlot('AgentConfigPanel');
  const AgentConfigEditors = useSlot('AgentConfigEditors');
  const SaveAgentButton = useSlot('SaveAgentButton');
  const [editor, setEditor] = useState<AgentConfigEditor | null>(null);
  const commitInstructions = useCallback(
    (instructions: string) => updateAgentSpec?.({ instructions }),
    [updateAgentSpec],
  );
  const {
    draft: instructionDraft,
    onChange: onInstructionChange,
    flush: flushInstructions,
  } = useDebouncedAgentInstructions({
    value: agentSpec?.instructions ?? '',
    onCommit: commitInstructions,
  });

  useEffect(() => {
    if (shell.agentConfigOpen) catalog.ensureLoaded();
  }, [catalog, shell.agentConfigOpen]);

  useEffect(() => {
    if (!shell.agentConfigOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        flushInstructions();
        void flushAgentSpec();
        shell.setAgentConfigOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [flushAgentSpec, flushInstructions, shell]);

  useEffect(
    () => () => {
      flushInstructions();
      void flushAgentSpec();
    },
    [flushAgentSpec, flushInstructions],
  );

  const updateSpec = useCallback(
    (next: AgentSpec) => {
      if (next.skills && next.skills.length > 0 && capabilities?.sandbox.enabled === true) {
        updateAgentSpec?.({
          ...next,
          instructions: instructionDraft,
          config: {
            ...next.config,
            sandbox: { ...next.config?.sandbox, enabled: true },
          },
        });
        return;
      }
      updateAgentSpec?.({ ...next, instructions: instructionDraft });
    },
    [capabilities?.sandbox.enabled, instructionDraft, updateAgentSpec],
  );

  const loadMcpTools = useCallback(
    async (connectorId: string): Promise<McpToolSelection[]> => {
      if (server?.getMcpTools === undefined) return [];
      return server.getMcpTools({ connectorId });
    },
    [server],
  );

  if (!shell.agentConfigOpen || agentSpec === null || shell.mode.status !== 'active' || !shell.mode.isMutable) {
    return null;
  }

  const model = catalog.models.find(item => item.name === agentSpec.model.name);

  return (
    <>
      <AgentConfigPanel
        spec={agentSpec}
        model={model}
        saveAction={<SaveAgentButton />}
        skillsAvailable={capabilities?.skill.enabled === true}
        instructions={instructionDraft}
        onInstructionsChange={onInstructionChange}
        onInstructionsBlur={flushInstructions}
        onChange={updateSpec}
        onOpenEditor={setEditor}
      />
      <AgentConfigEditors
        editor={editor}
        spec={agentSpec}
        models={catalog.models}
        connectors={catalog.connectors}
        skills={catalog.skills}
        loading={catalog.loading}
        error={catalog.error}
        skillsDisabled={capabilities?.skill.enabled !== true}
        sandboxAvailable={capabilities?.sandbox.enabled === true}
        loadMcpTools={loadMcpTools}
        onRefreshConnectors={catalog.refreshConnectors}
        onChange={updateSpec}
        onClose={() => setEditor(null)}
      />
    </>
  );
}
