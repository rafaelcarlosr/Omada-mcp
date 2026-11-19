import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { radiusProxyPayloadSchema } from '../omadaClient/controllerSettings.js';
import type { OmadaClient } from '../omadaClient/index.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runSettings } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    payload: radiusProxyPayloadSchema.describe(
        'RADIUS proxy (official Radius Proxy Server Setting RequestBody): enable, port, and with enable:true requireMessageAuthenticator and limitProxyState.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getRadiusProxyConfig' | 'setRadiusProxy'>;

export function registerSetRadiusProxyTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setRadiusProxy',
        {
            description:
                'Turn the controller RADIUS proxy server on or off, with its port and Message-Authenticator and Proxy-State options. Defaults to a preview of the current setting and differences; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setRadiusProxy',
            mutationSummary('set-radius-proxy', () => 'controller'),
            async ({ payload, customHeaders, dryRun }) =>
                await runSettings({
                    label: 'RADIUS proxy',
                    read: () => client.getRadiusProxyConfig(customHeaders),
                    payload,
                    dryRun,
                    write: () => client.setRadiusProxy(payload, customHeaders),
                    writeOnly: payload.enable ? [] : ['port'],
                    warnings: ['Enabling opens the RADIUS proxy port on the controller.'],
                })
        )
    );
}
