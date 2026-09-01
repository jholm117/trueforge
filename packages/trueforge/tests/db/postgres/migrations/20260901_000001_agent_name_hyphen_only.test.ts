import { sql } from 'kysely';

import { up } from '../../../../src/db/postgres/migrations/20260901_000001_agent_name_hyphen_only';
import { createPostgresTestDatabase, type PostgresTestDatabase } from '../testDatabase';

const describePg = process.env['PG_STORE_TESTS_ENABLED'] === '1' ? describe : describe.skip;
const PREVIOUS_MIGRATION = '20260831_000001_session_external_id';

describePg('Postgres agent name hyphen migration', () => {
  let env: PostgresTestDatabase | undefined;

  beforeAll(async () => {
    env = await createPostgresTestDatabase(PREVIOUS_MIGRATION);
    if (env === undefined) {
      throw new Error('Postgres test environment unavailable despite globalSetup probe');
    }
  }, 120_000);

  afterAll(async () => {
    await env?.teardown();
  });

  it('renames agent and session.agent_name', async () => {
    if (env === undefined) {
      throw new Error('Postgres test environment not initialized');
    }

    const manifest = JSON.stringify({ model: { name: 'provider/model' } });
    await sql`
      INSERT INTO agent (id, tenant_id, name, manifest, created_at, updated_at)
      VALUES ('agent-1', 'tenant-1', 'my.agent', ${manifest}::jsonb, now(), now())
    `.execute(env.db);
    await sql`
      INSERT INTO session (
        tenant_id,
        session_id,
        created_by,
        agent_id,
        agent_name,
        agent_spec,
        title,
        last_turn_id,
        custom,
        last_activity_timestamp_ms,
        created_at,
        updated_at
      )
      VALUES (
        'tenant-1',
        'session-1',
        'user-1',
        'agent-1',
        'my.agent',
        NULL,
        NULL,
        NULL,
        NULL,
        0,
        now(),
        now()
      )
    `.execute(env.db);

    await env.db.transaction().execute(async transaction => {
      await up(transaction);
    });

    const agent = await sql<{ name: string }>`SELECT name FROM agent WHERE id = 'agent-1'`.execute(env.db);
    const session = await sql<{ agent_name: string | null }>`
      SELECT agent_name FROM session WHERE session_id = 'session-1'
    `.execute(env.db);
    expect(agent.rows[0]?.name).toBe('my-agent');
    expect(session.rows[0]?.agent_name).toBe('my-agent');
  });
});
