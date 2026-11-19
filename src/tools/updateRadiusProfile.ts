import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import {
    createRadiusProfileOpenApiVOSchema,
    radiusAcctServerOpenApiVOSchema,
    radiusAuthServerOpenApiVOSchema,
} from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { checkRadiusProfile, pickBySchema, refuseBuiltInRadiusProfile, withServerSecrets } from './authProfileShared.js';
import { dryRunSchema, findRecord, mutationSummary, type RecordLike, runUpdate, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    radiusProfileId: z.string().trim().min(1).describe('RADIUS profile ID (radiusProfileId) from listRadiusProfiles.'),
    changes: createRadiusProfileOpenApiVOSchema
        .partial()
        .extend({
            authServer: z.array(radiusAuthServerOpenApiVOSchema.partial({ radiusPwd: true })).optional(),
            acctServer: z.array(radiusAcctServerOpenApiVOSchema.partial({ accountingServerPwd: true })).optional(),
        })
        .refine((value) => Object.keys(value).length > 0, 'At least one change is required.')
        .describe(
            'Fields to change; the others keep their current values. A server listed without its password keeps the current password of the server with the same address.'
        ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listRadiusProfiles' | 'updateRadiusProfile'>;

export function registerUpdateRadiusProfileTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateRadiusProfile',
        {
            description:
                'Change a RADIUS profile. Only the listed fields change; the controller needs the complete profile, so the rest, server passwords included, is taken from the current profile. The built-in profile is refused. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateRadiusProfile',
            mutationSummary('update-radius-profile', (args) => String(args.radiusProfileId)),
            async ({ radiusProfileId, changes, siteId, customHeaders, dryRun }) => {
                const current = findRecord(toRecords(await client.listRadiusProfiles(siteId, customHeaders)), radiusProfileId, ['radiusProfileId']);
                if (!current) throw new Error(`No RADIUS profile with id "${radiusProfileId}" exists. List them again to get a current id.`);
                refuseBuiltInRadiusProfile(current);
                const payload = createRadiusProfileOpenApiVOSchema.parse(
                    pickBySchema(createRadiusProfileOpenApiVOSchema, {
                        ...current,
                        ...changes,
                        authServer: withServerSecrets(changes.authServer ?? current.authServer, current.authServer, 'radiusServerIp', 'radiusPwd'),
                        acctServer: withServerSecrets(
                            changes.acctServer ?? current.acctServer,
                            current.acctServer,
                            'accountingServerIp',
                            'accountingServerPwd'
                        ),
                    })
                );
                checkRadiusProfile(payload);
                return await runUpdate({
                    spec: { label: 'RADIUS profile', list: () => client.listRadiusProfiles(siteId, customHeaders), idKeys: ['radiusProfileId'] },
                    id: radiusProfileId,
                    payload: payload as RecordLike,
                    dryRun,
                    write: () => client.updateRadiusProfile(radiusProfileId, payload, siteId, customHeaders),
                    warnings: ['SSIDs and portals using this profile authenticate against the changed servers.'],
                });
            }
        )
    );
}
