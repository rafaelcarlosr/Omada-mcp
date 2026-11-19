import { z } from 'zod';
import { SITE_TEMPLATE_TOOLS } from '../omadaClient/templateRoutes.js';
import { runInSiteTemplateScope } from '../omadaClient/templateScope.js';
import type { CatalogTool } from '../server/catalog.js';
import { siteInputSchema } from '../server/common.js';

export const siteTemplateIdSchema = z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('Configure this site template (ID from getSiteTemplateList) instead of a site. Do not combine with siteId.');

type ToolDefinition = Pick<CatalogTool, 'name' | 'inputSchema' | 'handler'>;

/**
 * Adds the optional siteTemplateId to a site tool whose every route has a site template mirror in the spec
 * (SITE_TEMPLATE_TOOLS) and whose siteId is the shared optional site input. Other tools are returned unchanged.
 */
export function withSiteTemplateOption<T extends ToolDefinition>(tool: T): T {
    const eligible =
        SITE_TEMPLATE_TOOLS.has(tool.name) && tool.inputSchema.siteId === siteInputSchema.shape.siteId && !('siteTemplateId' in tool.inputSchema);
    if (!eligible) return tool;
    const { handler } = tool;
    return {
        ...tool,
        inputSchema: { ...tool.inputSchema, siteTemplateId: siteTemplateIdSchema },
        handler: async (args, extra) => {
            const { siteTemplateId, ...rest } = args;
            if (typeof siteTemplateId !== 'string') return await handler(rest, extra);
            if (rest.siteId !== undefined) throw new Error('Use either siteId or siteTemplateId, not both. No request was sent.');
            return await runInSiteTemplateScope(siteTemplateId, (siteId) => handler({ ...rest, siteId }, extra));
        },
    };
}
