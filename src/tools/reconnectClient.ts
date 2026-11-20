import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { pick, requireClientDetail, runAction } from './resourceMutationShared.js';

const clientMacSchema = z
    .string()
    .trim()
    .regex(/^[0-9A-Fa-f]{2}([:-][0-9A-Fa-f]{2}){5}$/, 'Invalid client MAC address format. Expected "AA-BB-CC-DD-EE-FF" or "AA:BB:CC:DD:EE:FF".');

export function registerReconnectClientTool(server: McpServer, client: OmadaClient): void {
    const inputSchema = siteInputSchema.extend({
        clientMac: clientMacSchema.describe('Client MAC address to reconnect.'),
        dryRun: z.boolean().optional().default(true).describe('If true, return the planned action without sending it to the controller.'),
    });

    server.registerTool(
        'reconnectClient',
        {
            description:
                'Force a wireless client to disconnect and reconnect. Preview is the default and shows the client; set dryRun:false to send the request once. There is no readable end state to verify.',
            inputSchema: inputSchema.shape,
            annotations: {
                destructiveHint: true,
            },
        },
        wrapMutationToolHandler(
            'reconnectClient',
            ({ clientMac, siteId }, result, mode) => ({
                action: 'reconnect-client',
                target: clientMac,
                siteId,
                mode,
                status: mode === 'dry-run' ? 'planned' : 'applied',
                summary: mode === 'dry-run' ? `Planned client reconnect for ${clientMac}.` : `Client reconnect requested for ${clientMac}.`,
                result,
            }),
            async ({ clientMac, siteId, customHeaders, dryRun }) =>
                await runAction({
                    label: 'client reconnect',
                    dryRun,
                    preflight: async () =>
                        pick(await requireClientDetail(() => client.getClientDetail(clientMac, siteId, customHeaders), clientMac), [
                            'mac',
                            'name',
                            'wireless',
                            'ssid',
                            'apMac',
                            'active',
                        ]),
                    write: () => client.reconnectClient(clientMac, siteId, customHeaders),
                    warnings: ['The client is briefly disconnected and must rejoin on its own.'],
                })
        )
    );
}
