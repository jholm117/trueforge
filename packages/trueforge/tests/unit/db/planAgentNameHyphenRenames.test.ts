import { hyphenateAgentNameSeparators, planAgentNameHyphenRenames } from '../../../src/db/planAgentNameHyphenRenames';

describe('planAgentNameHyphenRenames', () => {
  it('replaces "." and "_" with "-"', () => {
    expect(hyphenateAgentNameSeparators('my.agent_name')).toBe('my-agent-name');
    expect(planAgentNameHyphenRenames([{ id: '1', tenant_id: 't', name: 'my.agent_name' }])).toEqual([
      { id: '1', tenant_id: 't', from: 'my.agent_name', to: 'my-agent-name' },
    ]);
  });

  it('skips names that are already hyphen-only', () => {
    expect(planAgentNameHyphenRenames([{ id: '1', tenant_id: 't', name: 'my-agent' }])).toEqual([]);
  });

  it('suffixes on collision within a tenant and isolates tenants', () => {
    expect(
      planAgentNameHyphenRenames([
        { id: 'b', tenant_id: 't1', name: 'a_b' },
        { id: 'a', tenant_id: 't1', name: 'a.b' },
        { id: 'c', tenant_id: 't1', name: 'a-b' },
        { id: 'd', tenant_id: 't2', name: 'a.b' },
      ]),
    ).toEqual([
      { id: 'a', tenant_id: 't1', from: 'a.b', to: 'a-b-2' },
      { id: 'b', tenant_id: 't1', from: 'a_b', to: 'a-b-3' },
      { id: 'd', tenant_id: 't2', from: 'a.b', to: 'a-b' },
    ]);
  });

  it('truncates the base so a collision suffix fits in 64 characters', () => {
    const target = `a${'b'.repeat(61)}-b`;
    const from = `a${'b'.repeat(61)}.b`;
    expect(target).toHaveLength(64);
    expect(from).toHaveLength(64);
    expect(
      planAgentNameHyphenRenames([
        { id: '1', tenant_id: 't', name: target },
        { id: '2', tenant_id: 't', name: from },
      ]),
    ).toEqual([
      {
        id: '2',
        tenant_id: 't',
        from,
        to: `${target.slice(0, 62)}-2`,
      },
    ]);
  });
});
