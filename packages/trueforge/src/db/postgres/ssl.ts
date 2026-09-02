/** Resolved `pg` Pool `ssl` option from `POSTGRES_SSL_MODE`. */
export type PostgresSslConfig = boolean | { rejectUnauthorized: false };

export function resolvePostgresSslConfig(mode: string | undefined): PostgresSslConfig {
  switch (mode?.trim()) {
    case 'prefer':
    case 'require':
    case 'verify-ca':
    case 'verify-full': {
      return true;
    }
    case 'no-verify': {
      return { rejectUnauthorized: false };
    }
    default: {
      return false;
    }
  }
}
