/**
 * Plans one-shot renames of agent registry names that still contain "." or "_"
 * into the SVC-aligned hyphen-only form (`AgentNameSchema`).
 *
 * Examples: `my.agent` → `my-agent`; `a.b` + existing `a-b` → `a-b-2`;
 * 64-char collision → truncate the base so `-{n}` still fits (names may be inconsistent).
 */
export interface AgentNameRow {
  id: string;
  tenant_id: string;
  name: string;
}

export interface AgentNameRename {
  id: string;
  tenant_id: string;
  from: string;
  to: string;
}

const NEEDS_RENAME = /[._]/;
const MAX_LEN = 64;

export function hyphenateAgentNameSeparators(name: string): string {
  return name.replace(/[._]/g, '-');
}

export function planAgentNameHyphenRenames(agents: readonly AgentNameRow[]): AgentNameRename[] {
  const byTenant = new Map<string, AgentNameRow[]>();
  for (const agent of agents) {
    const list = byTenant.get(agent.tenant_id);
    if (list === undefined) {
      byTenant.set(agent.tenant_id, [agent]);
    } else {
      list.push(agent);
    }
  }

  const renames: AgentNameRename[] = [];
  for (const [tenantId, rows] of [...byTenant.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const occupied = new Set(rows.map(row => row.name));
    const ordered = [...rows].sort((a, b) => a.id.localeCompare(b.id));
    for (const agent of ordered) {
      if (!NEEDS_RENAME.test(agent.name)) {
        continue;
      }
      const base = hyphenateAgentNameSeparators(agent.name);
      let candidate = base;
      let n = 2;
      while (occupied.has(candidate) && candidate !== agent.name) {
        const suffix = `-${String(n)}`;
        const truncatedBase = base.slice(0, MAX_LEN - suffix.length);
        candidate = `${truncatedBase}${suffix}`;
        n += 1;
      }
      occupied.delete(agent.name);
      occupied.add(candidate);
      if (candidate !== agent.name) {
        renames.push({ id: agent.id, tenant_id: tenantId, from: agent.name, to: candidate });
      }
    }
  }
  return renames;
}
