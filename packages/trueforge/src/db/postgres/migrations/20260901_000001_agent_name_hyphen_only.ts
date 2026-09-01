import { sql, type Kysely } from 'kysely';
import { planAgentNameHyphenRenames, type AgentNameRow } from '../../planAgentNameHyphenRenames';

const MIGRATION_ID = '20260901_000001_agent_name_hyphen_only';

/**
 * Rewrite agent names that contain "." or "_" to hyphen-only 2–64 form (AGE-2065).
 * Updates `agent.name` and denormalized `session.agent_name`.
 * Irreversible: originals are not retained.
 */
export async function up<TDatabase>(db: Kysely<TDatabase>): Promise<void> {
  try {
    await sql`SET LOCAL lock_timeout = '5s'`.execute(db);

    const agents = await sql<AgentNameRow>`
      SELECT id, tenant_id, name FROM agent
    `.execute(db);
    const renames = planAgentNameHyphenRenames(agents.rows);
    if (renames.length === 0) {
      return;
    }

    for (const rename of renames) {
      await sql`
        UPDATE agent
        SET name = ${rename.to}, updated_at = now()
        WHERE id = ${rename.id}
      `.execute(db);
      await sql`
        UPDATE session
        SET agent_name = ${rename.to}
        WHERE tenant_id = ${rename.tenant_id} AND agent_name = ${rename.from}
      `.execute(db);
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed agent name hyphen migration (${MIGRATION_ID}): ${detail}; rename colliding agents manually and retry`,
      { cause: error },
    );
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  void db;
  return Promise.reject(new Error(`${MIGRATION_ID} is not reversible`));
}
