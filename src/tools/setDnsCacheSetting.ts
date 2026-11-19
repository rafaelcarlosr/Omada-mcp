import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { dnsCacheOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, type RecordLike, runSettings } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    changes: dnsCacheOpenApiVOSchema
        .partial()
        .refine((value) => Object.keys(value).length > 0, 'At least one change is required.')
        .describe('Fields to change: enable and ttl (1-86400 seconds, needed while enabled).'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getDnsCacheSetting' | 'setDnsCacheSetting'>;

export function registerSetDnsCacheSettingTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setDnsCacheSetting',
        {
            description:
                'Turn the gateway DNS cache on or off and set its TTL. Unlisted fields keep their current values. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setDnsCacheSetting',
            mutationSummary('set-dns-cache', () => 'site'),
            async ({ changes, siteId, customHeaders, dryRun }) => {
                const read = async (): Promise<RecordLike> => ((await client.getDnsCacheSetting(siteId, customHeaders)) ?? {}) as RecordLike;
                const merged = { ...(await read()), ...changes };
                if (merged.enable === true && merged.ttl === undefined) throw new Error('Enabling the DNS cache needs ttl. No request was sent.');
                // A disabled cache is read back without its TTL, so only the switch is sent and verified.
                const payload = dnsCacheOpenApiVOSchema.parse(merged.enable === true ? { enable: true, ttl: merged.ttl } : { enable: false });
                return await runSettings({
                    label: 'DNS cache',
                    read,
                    payload: payload as RecordLike,
                    dryRun,
                    write: () => client.setDnsCacheSetting(payload, siteId, customHeaders),
                });
            }
        )
    );
}
