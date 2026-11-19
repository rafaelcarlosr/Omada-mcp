import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { modifyIPSAllowListEntrySchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { allowEntryRequest, allPages, checkAllowEntry } from './ipsShared.js';
import { dryRunSchema, findRecord, mutationSummary, type RecordLike, runUpdate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    entryId: z.string().trim().min(1).describe('Allow list entry ID from getGridAllowList.'),
    changes: modifyIPSAllowListEntrySchema
        .omit({ id: true })
        .refine((value) => Object.keys(value).length > 0, 'At least one change is required.')
        .describe('Fields to change; the others keep their current values. A new trafficType needs its matching ipAddress, network or subnet.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getGridAllowList' | 'updateIpsAllowEntry'>;

export function registerUpdateIpsAllowEntryTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateIpsAllowEntry',
        {
            description:
                'Change an IPS allow list entry. Only the listed fields change; the controller needs the complete entry, so the rest comes from the current entry. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateIpsAllowEntry',
            mutationSummary('update-ips-allow-entry', (args) => String(args.entryId)),
            async ({ entryId, changes, siteId, customHeaders, dryRun }) => {
                const spec = {
                    label: 'IPS allow list entry',
                    list: () => allPages((page, size) => client.getGridAllowList(page, size, undefined, siteId, customHeaders)),
                    nameKey: null,
                    normalize: allowEntryRequest,
                };
                const current = findRecord(await spec.list(), entryId);
                if (!current) throw new Error(`No IPS allow list entry with id "${entryId}" exists. List them again to get a current id.`);
                const base = allowEntryRequest(current);
                const sameType = changes.trafficType === undefined || changes.trafficType === base.trafficType;
                const merged = {
                    id: entryId,
                    direction: changes.direction ?? base.direction,
                    trafficType: changes.trafficType ?? base.trafficType,
                    ...(sameType ? Object.fromEntries(Object.entries(base).filter(([key]) => ['ipAddress', 'network', 'subnet'].includes(key))) : {}),
                    ...changes,
                };
                checkAllowEntry(merged);
                const payload = modifyIPSAllowListEntrySchema.parse(merged);
                return await runUpdate({
                    spec,
                    id: entryId,
                    payload: payload as RecordLike,
                    dryRun,
                    write: () => client.updateIpsAllowEntry(payload, siteId, customHeaders),
                });
            }
        )
    );
}
