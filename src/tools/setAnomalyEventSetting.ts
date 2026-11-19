import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, findRecord, mutationSummary, runSettings, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    anomalyCode: z.string().trim().min(1).describe('Anomaly event code from listAnomalySettings.'),
    enable: z.boolean().optional().describe('Detect this anomaly.'),
    level: z.number().int().min(0).max(3).optional().describe('Severity: 0 critical, 1 error, 2 warning, 3 info.'),
    params: z.record(z.string(), z.unknown()).optional().describe('Detection thresholds of this anomaly, as listed by listAnomalySettings.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listAnomalySettings' | 'setAnomalyEventSetting'>;

export function registerSetAnomalyEventSettingTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setAnomalyEventSetting',
        {
            description:
                'Turn detection of one anomaly (incident type) on or off and set its severity and thresholds. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setAnomalyEventSetting',
            mutationSummary('set-anomaly-event-setting', (args) => String(args.anomalyCode)),
            async ({ anomalyCode, enable, level, params, siteId, customHeaders, dryRun }) => {
                const read = async (): Promise<unknown> =>
                    findRecord(
                        toRecords(((await client.listAnomalySettings(1, 1000, siteId, customHeaders)) as { data?: unknown })?.data ?? []),
                        anomalyCode,
                        ['anomalyCode']
                    );
                if (!(await read())) throw new Error(`No anomaly with code "${anomalyCode}" exists. No request was sent.`);
                const payload = {
                    ...(enable === undefined ? {} : { enable }),
                    ...(level === undefined ? {} : { level }),
                    ...(params === undefined ? {} : { params }),
                };
                if (Object.keys(payload).length === 0) throw new Error('Send at least one of enable, level or params.');
                return await runSettings({
                    label: 'anomaly detection',
                    read,
                    payload,
                    dryRun,
                    write: () => client.setAnomalyEventSetting({ anomalyCode, ...payload }, siteId, customHeaders),
                });
            }
        )
    );
}
