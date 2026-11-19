import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { builtInRADIUSServerConfigRequestBody21Schema } from '../omadaClient/requestSchemas.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { pickBySchema } from './authProfileShared.js';
import { dryRunSchema, mutationSummary, type RecordLike, runSettings } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    changes: builtInRADIUSServerConfigRequestBody21Schema
        .partial()
        .refine((value) => Object.keys(value).length > 0, 'At least one change is required.')
        .describe(
            'Fields of the official Built-In RADIUS server setting to change (enable, authServerPort, secret, tunnelReplyEnable, serverAddressType, customAddress, requireMessageAuthenticator, limitProxyState). The current secret is kept when omitted; a controller that never had one needs it. Other fields only persist while the server is enabled.'
        ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getRadiusServer' | 'setRadiusServer'>;

export function registerSetRadiusServerTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setRadiusServer',
        {
            description:
                'Change the controller built-in RADIUS server. Enabling it opens its UDP port on the controller; changing the secret or port breaks RADIUS clients until they are updated. Defaults to a preview; set dryRun:false to apply once and verify by readback (the secret cannot be read back).',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setRadiusServer',
            mutationSummary('set-radius-server', () => 'controller'),
            async ({ changes, customHeaders, dryRun }) => {
                const read = async (): Promise<RecordLike> => ((await client.getRadiusServer(customHeaders)) ?? {}) as RecordLike;
                const merged = { ...(await read()), ...changes };
                if (merged.secret === undefined) {
                    throw new Error('secret is required: no secret has been set on this controller yet. No request was sent.');
                }
                const ignored = Object.keys(changes).filter((key) => key !== 'enable' && key !== 'secret');
                if (merged.enable !== true && ignored.length) {
                    throw new Error(
                        `The controller does not keep ${ignored.join(', ')} while the built-in RADIUS server is disabled; set enable:true in the same change. No request was sent.`
                    );
                }
                const payload = builtInRADIUSServerConfigRequestBody21Schema.parse(
                    pickBySchema(builtInRADIUSServerConfigRequestBody21Schema, merged)
                );
                return await runSettings({
                    label: 'built-in RADIUS server',
                    read,
                    payload: payload as RecordLike,
                    dryRun,
                    write: () => client.setRadiusServer(payload, customHeaders),
                    writeOnly: ['secret'],
                    warnings: ['RADIUS clients (APs, gateways) using the built-in server must use the new port and secret.'],
                });
            }
        )
    );
}
