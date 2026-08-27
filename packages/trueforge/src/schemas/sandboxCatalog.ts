/**
 * Shipped sandbox-catalog.yaml schemas (discovery presets). Separate from
 * configured provider manifests in sandboxProvider.ts.
 */
import { z } from '@hono/zod-openapi';
import { DaytonaSandboxProviderSchema, ModalSandboxProviderSchema } from './sandboxProvider';

/**
 * Catalog wire type. Single variant today (avoids one-member `oneOf` in OpenAPI).
 * Widen to a discriminated union when a second provider ships.
 */
export const CatalogSandboxProviderSchema = z
  .discriminatedUnion('type', [
    DaytonaSandboxProviderSchema.omit({ auth: true }).strict(),
    ModalSandboxProviderSchema.omit({ auth: true }).strict(),
  ])
  .openapi('CatalogSandboxProvider');

export const SandboxCatalogFileSchema = z
  .object({
    providers: z.array(CatalogSandboxProviderSchema),
  })
  .strict();

export const GetSandboxProviderCatalogResponseSchema = z
  .object({
    data: z.array(CatalogSandboxProviderSchema),
  })
  .openapi('GetSandboxProviderCatalogResponse');

export type CatalogSandboxProvider = z.infer<typeof CatalogSandboxProviderSchema>;
export type SandboxCatalogFile = z.infer<typeof SandboxCatalogFileSchema>;
