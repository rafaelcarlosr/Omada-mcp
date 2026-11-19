import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runSettings } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    currency: z
        .string()
        .regex(/^[A-Z]{3}$/, 'A three-letter currency code such as USD.')
        .describe('Currency code from listVoucherCurrencies.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getVoucherSummary' | 'setVoucherCurrency'>;

export function registerSetVoucherCurrencyTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setVoucherCurrency',
        {
            description:
                'Set the currency used for voucher prices and statistics in the site. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setVoucherCurrency',
            mutationSummary('set-voucher-currency', (args) => String(args.currency)),
            async ({ currency, siteId, customHeaders, dryRun }) =>
                await runSettings({
                    label: 'voucher currency',
                    read: async () => {
                        const summary = (await client.getVoucherSummary(siteId, customHeaders)) as { current?: { currency?: unknown } } | undefined;
                        return summary?.current?.currency === undefined ? {} : { currency: summary.current.currency };
                    },
                    payload: { currency },
                    dryRun,
                    write: () => client.setVoucherCurrency(currency, siteId, customHeaders),
                    warnings: ['Existing voucher prices keep their numbers; only the currency label changes.'],
                })
        )
    );
}
