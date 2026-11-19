import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runSettings, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    profileId: z.string().trim().min(1).describe('PPSK profile ID from getPPSKProfiles.'),
    names: z.array(z.string().trim().min(1)).min(1).max(1024).describe('Names of the PSK entries to delete.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deletePpskEntries' | 'getPpskUserGroup'>;

export function registerDeletePpskEntriesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deletePpskEntries',
        {
            description:
                'Delete PSK entries from a PPSK profile by name; devices using them can no longer join. Defaults to a preview; set dryRun:false to delete and verify each name is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deletePpskEntries',
            mutationSummary('delete-ppsk-entries', (args) => `${(args.names as unknown[]).length} entry(ies)`),
            async ({ profileId, names, siteId, customHeaders, dryRun }) =>
                await runSettings({
                    label: 'PPSK entries',
                    read: async () => {
                        const profile = (await client.getPpskUserGroup(profileId, siteId, customHeaders)) as { ppsk?: unknown } | undefined;
                        const current = toRecords(profile?.ppsk ?? []).map((entry) => String(entry.name));
                        return Object.fromEntries(names.map((name) => [name, current.includes(name)]));
                    },
                    payload: Object.fromEntries(names.map((name) => [name, false])),
                    dryRun,
                    write: () => client.deletePpskEntries(profileId, names, siteId, customHeaders),
                    warnings: ['Devices using these PSKs can no longer join.'],
                })
        )
    );
}
