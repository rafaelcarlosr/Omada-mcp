import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { ppskSettingSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runSettings, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    profileId: z.string().trim().min(1).describe('PPSK profile ID from getPPSKProfiles.'),
    entries: z.array(ppskSettingSchema).min(1).max(1024).describe('PSK entries to add: name, psk, optional mac and vlan.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'addPpskEntries' | 'getPpskUserGroup'>;

export function registerAddPpskEntriesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'addPpskEntries',
        {
            description:
                'Add PSK entries to a PPSK profile. Entries are matched by name; PSKs are redacted in every response. Defaults to a preview; set dryRun:false to add and verify each name is present.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'addPpskEntries',
            mutationSummary('add-ppsk-entries', (args) => `${(args.entries as unknown[]).length} entry(ies)`),
            async ({ profileId, entries, siteId, customHeaders, dryRun }) => {
                const names = entries.map((entry) => entry.name);
                if (new Set(names).size !== names.length) throw new Error('Entry names must be unique. No request was sent.');
                return await runSettings({
                    label: 'PPSK entries',
                    read: async () => {
                        const profile = (await client.getPpskUserGroup(profileId, siteId, customHeaders)) as { ppsk?: unknown } | undefined;
                        const current = toRecords(profile?.ppsk ?? []).map((entry) => String(entry.name));
                        return Object.fromEntries(names.map((name) => [name, current.includes(name)]));
                    },
                    payload: Object.fromEntries(names.map((name) => [name, true])),
                    dryRun,
                    write: () => client.addPpskEntries(profileId, { ppskList: entries }, siteId, customHeaders),
                });
            }
        )
    );
}
