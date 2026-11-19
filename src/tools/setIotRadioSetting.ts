import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { iotRadioPayloadSchema } from '../omadaClient/siteServices.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, pick, type RecordLike, runSettings } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: iotRadioPayloadSchema
        .partial({ enable: true })
        .describe(
            'IoT radio fields to change (official IotRadioSettingOpenApiVO): enable, consoleMode (0 auto, 1 on, 2 off), passcode (6 digits), transmitPower in dBm, agingTime with format (0 seconds 30-86400, 1 minutes 1-1440, 2 hours 1-24).'
        ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getIotRadioSetting' | 'setIotRadioSetting'>;

const FIELDS = Object.keys(iotRadioPayloadSchema.shape);

export function registerSetIotRadioSettingTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setIotRadioSetting',
        {
            description:
                'Change the AP Bluetooth (IoT) radio setting: enable, console mode and passcode, transmit power and device aging time. Only the fields sent are changed; the tool sends them together with the current values because the controller ignores or rejects partial updates. Defaults to a preview of the current setting and differences; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setIotRadioSetting',
            mutationSummary('set-iot-radio-setting', (args) => args.siteId ?? 'default-site'),
            async ({ payload, siteId, customHeaders, dryRun }) => {
                const read = (): Promise<unknown> => client.getIotRadioSetting(siteId, customHeaders);
                return await runSettings({
                    label: 'IoT radio',
                    read,
                    payload,
                    dryRun,
                    write: async () => {
                        const current = pick((await read()) as RecordLike, FIELDS);
                        return await client.setIotRadioSetting(iotRadioPayloadSchema.parse({ ...current, ...payload }), siteId, customHeaders);
                    },
                    warnings: ['Turning the radio off stops Bluetooth (IoT) reporting from every AP in the site.'],
                });
            }
        )
    );
}
