"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gateKey = gateKey;
exports.signPayload = signPayload;
exports.verifyPayload = verifyPayload;
exports.resetGateAuthState = resetGateAuthState;
var node_crypto_1 = require("node:crypto");
var config_1 = require("./config");
var lastAcceptedTs = new Map();
function gateKey(gateId) {
    return (0, node_crypto_1.createHmac)('sha256', config_1.config.gateMasterSecret).update(gateId).digest('hex');
}
function canonical(gateId, ts, studentNumber, tagUid) {
    return [gateId, ts, studentNumber !== null && studentNumber !== void 0 ? studentNumber : '', tagUid !== null && tagUid !== void 0 ? tagUid : ''].join('|');
}
function signPayload(gateId, ts, studentNumber, tagUid) {
    return (0, node_crypto_1.createHmac)('sha256', gateKey(gateId)).update(canonical(gateId, ts, studentNumber, tagUid)).digest('hex');
}
function verifyPayload(gateId, payload, now) {
    var _a;
    if (now === void 0) { now = Date.now(); }
    if (!config_1.config.gateSigningRequired)
        return true;
    if (typeof payload.ts !== 'number' || typeof payload.sig !== 'string')
        return false;
    if (Math.abs(now - payload.ts) > config_1.config.gateMaxSkewMs)
        return false;
    var expected = Buffer.from(signPayload(gateId, payload.ts, payload.studentNumber, payload.tagUid), 'hex');
    var given = Buffer.from(payload.sig, 'hex');
    if (expected.length !== given.length || !(0, node_crypto_1.timingSafeEqual)(expected, given))
        return false;
    var previous = (_a = lastAcceptedTs.get(gateId)) !== null && _a !== void 0 ? _a : 0;
    if (payload.ts <= previous)
        return false;
    lastAcceptedTs.set(gateId, payload.ts);
    return true;
}
function resetGateAuthState() {
    lastAcceptedTs.clear();
}
