"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var vitest_1 = require("vitest");
var gate_auth_1 = require("../src/gate-auth");
var gateId = '11111111-1111-4111-8111-111111111111';
var now = 1800000000000;
(0, vitest_1.beforeEach)(function () { return (0, gate_auth_1.resetGateAuthState)(); });
function signed(ts, studentNumber, tagUid) {
    if (studentNumber === void 0) { studentNumber = 'C'; }
    if (tagUid === void 0) { tagUid = 'T'; }
    return { studentNumber: studentNumber, tagUid: tagUid, ts: ts, sig: (0, gate_auth_1.signPayload)(gateId, ts, studentNumber, tagUid) };
}
(0, vitest_1.describe)('gate payload signing', function () {
    (0, vitest_1.it)('accepts a correctly signed, fresh payload', function () {
        (0, vitest_1.expect)((0, gate_auth_1.verifyPayload)(gateId, signed(now), now)).toBe(true);
    });
    (0, vitest_1.it)('rejects unsigned payloads', function () {
        (0, vitest_1.expect)((0, gate_auth_1.verifyPayload)(gateId, { studentNumber: 'C', tagUid: 'T' }, now)).toBe(false);
    });
    (0, vitest_1.it)('rejects a payload whose contents were changed after signing', function () {
        var payload = __assign(__assign({}, signed(now)), { tagUid: 'OTHER' });
        (0, vitest_1.expect)((0, gate_auth_1.verifyPayload)(gateId, payload, now)).toBe(false);
    });
    (0, vitest_1.it)('rejects a signature made for a different gate', function () {
        var otherGate = '22222222-2222-4222-8222-222222222222';
        (0, vitest_1.expect)((0, gate_auth_1.verifyPayload)(otherGate, signed(now), now)).toBe(false);
    });
    (0, vitest_1.it)('rejects stale and future timestamps', function () {
        (0, vitest_1.expect)((0, gate_auth_1.verifyPayload)(gateId, signed(now - 60000), now)).toBe(false);
        (0, vitest_1.expect)((0, gate_auth_1.verifyPayload)(gateId, signed(now + 60000), now)).toBe(false);
    });
    (0, vitest_1.it)('rejects a replay of an accepted message', function () {
        var payload = signed(now);
        (0, vitest_1.expect)((0, gate_auth_1.verifyPayload)(gateId, payload, now)).toBe(true);
        (0, vitest_1.expect)((0, gate_auth_1.verifyPayload)(gateId, payload, now + 1000)).toBe(false);
    });
    (0, vitest_1.it)('rejects a malformed signature without throwing', function () {
        (0, vitest_1.expect)((0, gate_auth_1.verifyPayload)(gateId, __assign(__assign({}, signed(now)), { sig: 'zz' }), now)).toBe(false);
    });
    (0, vitest_1.it)('derives a different key for every gate', function () {
        (0, vitest_1.expect)((0, gate_auth_1.gateKey)(gateId)).not.toBe((0, gate_auth_1.gateKey)('22222222-2222-4222-8222-222222222222'));
    });
});
