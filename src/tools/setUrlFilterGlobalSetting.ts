import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { urlFilterGlobalOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, type RecordLike, runSettings } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    changes: urlFilterGlobalOpenApiVOSchema
        .partial()
        .refine((value) => Object.keys(value).length > 0, 'At least one change is required.')
        .describe('Fields to change: blockPage, blockPageMessage (shown when blockPage is on) and safeSearch.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getUrlFilterGeneral' | 'setUrlFilterGlobalSetting'>;

export function registerSetUrlFilterGlobalSettingTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setUrlFilterGlobalSetting',
        {
            description:
                'Change the content filtering global setting: the block page shown for filtered URLs and enforced safe search. Unlisted fields keep their current values. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setUrlFilterGlobalSetting',
            mutationSummary('set-url-filter-global', () => 'site'),
            async ({ changes, siteId, customHeaders, dryRun }) => {
                const read = async (): Promise<RecordLike> => ((await client.getUrlFilterGeneral(siteId, customHeaders)) ?? {}) as RecordLike;
                const merged = { blockPage: false, safeSearch: false, ...(await read()), ...changes };
                const payload = urlFilterGlobalOpenApiVOSchema.parse({
                    blockPage: merged.blockPage,
                    safeSearch: merged.safeSearch,
                    ...(merged.blockPage === true && merged.blockPageMessage !== undefined ? { blockPageMessage: merged.blockPageMessage } : {}),
                });
                return await runSettings({
                    label: 'content filter global',
                    read,
                    payload: payload as RecordLike,
                    dryRun,
                    write: () => client.setUrlFilterGlobalSetting(payload, siteId, customHeaders),
                });
            }
        )
    );
}
