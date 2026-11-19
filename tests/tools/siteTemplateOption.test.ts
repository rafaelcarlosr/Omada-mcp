import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { assertSiteTemplateRequest } from '../../src/omadaClient/templateScope.js';
import type { CatalogTool } from '../../src/server/catalog.js';
import { siteInputSchema } from '../../src/server/common.js';
import { siteTemplateIdSchema, withSiteTemplateOption } from '../../src/tools/siteTemplateOption.js';

const result = { content: [{ type: 'text' as const, text: 'ok' }] };
const tool = (name: string, inputSchema: z.ZodRawShape) => ({ name, inputSchema, handler: vi.fn(() => Promise.resolve(result)) });

describe('tools/siteTemplateOption', () => {
    it('adds siteTemplateId to eligible site tools only', () => {
        const eligible = withSiteTemplateOption(tool('updateSsid', siteInputSchema.extend({ ssidId: z.string() }).shape));
        expect(eligible.inputSchema.siteTemplateId).toBe(siteTemplateIdSchema);
        for (const other of [
            tool('listDevices', siteInputSchema.shape),
            tool('updateSsid', { siteId: z.string() }),
            tool('updateSsid', { ...siteInputSchema.shape, siteTemplateId: z.string() }),
        ]) {
            expect(withSiteTemplateOption(other)).toBe(other);
        }
    });

    it('runs the tool against the template and confines its requests', async () => {
        const base = tool('updateSsid', siteInputSchema.shape);
        base.handler.mockImplementation(() => {
            expect(() => assertSiteTemplateRequest('GET', '/openapi/v1/cid/sites')).toThrow('No request was sent.');
            return Promise.resolve(result);
        });
        const wrapped = withSiteTemplateOption(base as Pick<CatalogTool, 'name' | 'inputSchema' | 'handler'>);
        await expect(wrapped.handler({ siteTemplateId: 't1', ssidId: 'x' }, {} as never)).resolves.toBe(result);
        expect(base.handler).toHaveBeenCalledWith({ siteId: 'sitetemplate:t1', ssidId: 'x' }, {});
    });

    it('passes site calls through and refuses siteId together with siteTemplateId', async () => {
        const base = tool('updateSsid', siteInputSchema.shape);
        const wrapped = withSiteTemplateOption(base as Pick<CatalogTool, 'name' | 'inputSchema' | 'handler'>);
        await wrapped.handler({ siteId: 's1' }, {} as never);
        expect(base.handler).toHaveBeenLastCalledWith({ siteId: 's1' }, {});
        await expect(wrapped.handler({ siteId: 's1', siteTemplateId: 't1' }, {} as never)).rejects.toThrow('Use either siteId or siteTemplateId');
        expect(base.handler).toHaveBeenCalledTimes(1);
    });
});
