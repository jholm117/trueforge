import { sql } from 'kysely';
import { createSqliteDb } from '../../../../../src/db/sqlite/client';
import { up } from '../../../../../src/db/sqlite/migrations/20260901_000001_agent_name_hyphen_only';

describe('SQLite agent name hyphen migration', () => {
  it('renames agent and session.agent_name', async () => {
    const db = createSqliteDb(':memory:');
    try {
      await sql`
        CREATE TABLE agent (
          id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          name TEXT NOT NULL,
          manifest BLOB NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (id),
          UNIQUE (tenant_id, name)
        ) STRICT
      `.execute(db);
      await sql`
        CREATE TABLE session (
          tenant_id TEXT NOT NULL,
          session_id TEXT NOT NULL,
          agent_name TEXT,
          PRIMARY KEY (session_id)
        ) STRICT
      `.execute(db);

      const now = '2026-09-01T00:00:00.000Z';
      await sql`
        INSERT INTO agent (id, tenant_id, name, manifest, created_at, updated_at)
        VALUES ('agent-1', 'tenant-1', 'my.agent', jsonb('{}'), ${now}, ${now})
      `.execute(db);
      await sql`
        INSERT INTO session (tenant_id, session_id, agent_name)
        VALUES ('tenant-1', 'session-1', 'my.agent')
      `.execute(db);

      await up(db);

      const agent = await sql<{ name: string }>`SELECT name FROM agent WHERE id = 'agent-1'`.execute(db);
      const session = await sql<{ agent_name: string | null }>`
        SELECT agent_name FROM session WHERE session_id = 'session-1'
      `.execute(db);
      expect(agent.rows[0]?.name).toBe('my-agent');
      expect(session.rows[0]?.agent_name).toBe('my-agent');
    } finally {
      await db.destroy();
    }
  });
});
