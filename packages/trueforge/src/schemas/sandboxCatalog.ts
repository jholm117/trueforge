/**
 * Shipped sandbox-catalog.yaml schemas (discovery presets). Separate from
 * configured provider manifests in sandboxProvider.ts.
 */
import { z } from '@hono/zod-openapi';
import { DaytonaSandboxProviderSchema, ModalSandboxProviderSchema } from './sandboxProvider';

const CatalogDaytonaSandboxProviderSchema = z
  .object(DaytonaSandboxProviderSchema.omit({ auth: true }).shape)
  .strict()
  .openapi('CatalogDaytonaSandboxProvider');

const CatalogModalSandboxProviderSchema = z
  .object(ModalSandboxProviderSchema.omit({ auth: true }).shape)
  .strict()
  .openapi('CatalogModalSandboxProvider');

export const CatalogSandboxProviderSchema = z
  .discriminatedUnion('type', [CatalogDaytonaSandboxProviderSchema, CatalogModalSandboxProviderSchema])
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
