import { describe, expect, it, vi } from 'vitest';

import { createLdapProfileOpenApiVOSchema, createRadiusProfileOpenApiVOSchema } from '../../src/omadaClient/requestSchemas.js';
import {
    allRadiusUsers,
    checkRadiusProfile,
    pickBySchema,
    radiusUserRecord,
    radiusUserRequest,
    refuseBuiltInRadiusProfile,
    withServerSecrets,
} from '../../src/tools/authProfileShared.js';

describe('tools/authProfileShared', () => {
    it('keeps only request fields, recursively', () => {
        expect(
            pickBySchema(createRadiusProfileOpenApiVOSchema, {
                radiusProfileId: 'r1',
                name: 'r',
                builtInServer: false,
                coaPassword: null,
                authServer: [{ radiusServerIp: '10.0.0.1', radiusPort: 1812, radiusPwd: 'p', extra: 1 }],
            })
        ).toEqual({ name: 'r', authServer: [{ radiusServerIp: '10.0.0.1', radiusPort: 1812, radiusPwd: 'p' }] });
        expect(pickBySchema(createLdapProfileOpenApiVOSchema, 'x')).toBe('x');
        expect(pickBySchema(createLdapProfileOpenApiVOSchema.optional(), { name: 'l', ldapProfileId: 'x' })).toEqual({ name: 'l' });
        expect(
            pickBySchema(
                createLdapProfileOpenApiVOSchema.refine(() => true),
                { name: 'l', ldapProfileId: 'x' }
            )
        ).toEqual({ name: 'l' });
    });

    it('keeps the current password of servers listed without one', () => {
        const current = [{ ip: 'a', pwd: 'pa' }, { ip: 'b', pwd: 'pb' }, 'junk'];
        expect(withServerSecrets([{ ip: 'a' }, { ip: 'b', pwd: 'new' }, { ip: 'c' }, 'x'], current, 'ip', 'pwd')).toEqual([
            { ip: 'a', pwd: 'pa' },
            { ip: 'b', pwd: 'new' },
            { ip: 'c' },
            'x',
        ]);
        expect(withServerSecrets(undefined, current, 'ip', 'pwd')).toBeUndefined();
        expect(withServerSecrets([{ ip: 'a' }], undefined, 'ip', 'pwd')).toEqual([{ ip: 'a' }]);
    });

    it('maps built-in RADIUS users to the request shape', () => {
        const user = { userId: 'u1', type: 0, username: 'u', password: 'p', upRateLimit: 0, downRateLimit: 1024, vlanId: 10 };
        expect(radiusUserRequest(user)).toEqual({ type: 0, userInfo: { username: 'u', password: 'p' }, downRateLimit: 1024, vlanId: 10 });
        expect(radiusUserRecord(user)).toMatchObject({ userId: 'u1', userInfo: { username: 'u' } });
        expect(radiusUserRequest({ type: 1, username: 'AA-BB-CC-00-11-22', password: 'x' })).toEqual({ type: 1, macAddress: 'AA-BB-CC-00-11-22' });
    });

    it('reads every page of built-in RADIUS users', async () => {
        const full = Array.from({ length: 100 }, (_, index) => ({ userId: `u${index}` }));
        const getRadiusUserList = vi
            .fn()
            .mockResolvedValueOnce({ data: full, totalRows: 101 })
            .mockResolvedValueOnce({ data: [{ userId: 'last' }], totalRows: 101 });
        const users = await allRadiusUsers({ getRadiusUserList }, 's1', undefined);
        expect(users).toHaveLength(101);
        expect(getRadiusUserList).toHaveBeenNthCalledWith(2, 2, 100, undefined, 's1', undefined);
        await expect(allRadiusUsers({ getRadiusUserList: vi.fn().mockResolvedValue({ data: [] }) }, undefined, undefined)).resolves.toEqual([]);
    });

    it('refuses the built-in profile and incomplete profiles', () => {
        expect(() => refuseBuiltInRadiusProfile({ name: 'Built-in', builtInServer: true })).toThrow('built-in RADIUS profile');
        expect(() => refuseBuiltInRadiusProfile({ name: 'r' })).not.toThrow();
        expect(() => checkRadiusProfile({ radiusAccountingEnable: true, interimUpdateEnable: true, coaEnable: true })).toThrow(
            'also needs acctServer, interimUpdateInterval, coaPassword'
        );
        expect(() => checkRadiusProfile({ radiusAccountingEnable: false })).not.toThrow();
    });
});
