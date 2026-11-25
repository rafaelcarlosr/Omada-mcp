import type { OmadaClient } from '../omadaClient/index.js';
import { normalizeMac, toRecords } from './resourceMutationShared.js';

type Client = Pick<OmadaClient, 'listSwitchPortOverview'>;

/**
 * Controller 6.3 rejects a PoE schedule naming a port without PoE with a bare -1001 "Invalid request parameters"
 * (observed on an SG2008P, where only ports 1-4 supply PoE). Check every port against the site port overview first.
 * A port whose PoE support is not reported is allowed; the controller remains the final authority.
 */
export async function assertPoeCapablePorts(
    client: Client,
    poePortsMap: Record<string, number[]>,
    siteId: string | undefined,
    customHeaders: Record<string, string> | undefined
): Promise<void> {
    const rows = toRecords(await client.listSwitchPortOverview(siteId, customHeaders));
    const problems: string[] = [];
    for (const [mac, ports] of Object.entries(poePortsMap)) {
        for (const port of ports) {
            const row = rows.find(
                (item) => typeof item.switchMac === 'string' && normalizeMac(item.switchMac) === normalizeMac(mac) && item.port === port
            );
            if (!row) problems.push(`port ${port} on switch ${mac} is not in this site's switch port overview`);
            else if (row.supportPoe === false) problems.push(`port ${port} on switch ${mac} does not supply PoE`);
        }
    }
    if (problems.length) throw new Error(`Invalid PoE schedule ports: ${problems.join('; ')}. No request was sent.`);
}
