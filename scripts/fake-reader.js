"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var mqtt_1 = require("mqtt");
var config_1 = require("../src/config");
var gate_auth_1 = require("../src/gate-auth");
var _b = process.argv.slice(2), gateId = _b[0], cardArg = _b[1], tagArg = _b[2];
if (!gateId) {
    console.error('Usage: npm run fake-reader -- <gateId> [studentNumber|-] [tagUid|-] [--heartbeat] [--unsigned]');
    process.exit(1);
}
var studentNumber = !cardArg || cardArg === '-' || cardArg.startsWith('--') ? null : cardArg;
var tagUid = !tagArg || tagArg === '-' || tagArg.startsWith('--') ? null : tagArg;
var heartbeat = process.argv.includes('--heartbeat');
var unsigned = process.argv.includes('--unsigned');
var prefix = config_1.config.mqttTopicPrefix;
var client = mqtt_1.default.connect((_a = config_1.config.mqttUrl) !== null && _a !== void 0 ? _a : 'mqtt://localhost:1883', {
    username: config_1.config.mqttUsername,
    password: config_1.config.mqttPassword,
});
var lastTs = 0;
function nextTs() {
    lastTs = Math.max(Date.now(), lastTs + 1);
    return lastTs;
}
function body(card, tag) {
    var ts = nextTs();
    if (unsigned)
        return { studentNumber: card, tagUid: tag };
    return { studentNumber: card, tagUid: tag, ts: ts, sig: (0, gate_auth_1.signPayload)(gateId, ts, card, tag) };
}
client.on('connect', function () {
    client.subscribe("".concat(prefix, "/").concat(gateId, "/decision"));
    if (heartbeat) {
        console.log('Sending a heartbeat every 5s. Ctrl+C to stop (the gate flips to manual shortly after).');
        var send = function () { return client.publish("".concat(prefix, "/").concat(gateId, "/heartbeat"), JSON.stringify(body(null, null))); };
        send();
        setInterval(send, 5000);
        return;
    }
    client.publish("".concat(prefix, "/").concat(gateId, "/scan"), JSON.stringify(body(studentNumber, tagUid)));
    setTimeout(function () {
        console.log('No decision received within 4s (check the API log for a rejected or malformed message).');
        client.end(false, {}, function () { return process.exit(1); });
    }, 4000);
});
client.on('message', function (_topic, payload) {
    console.log("Gate decision: ".concat(payload.toString()));
    client.end(false, {}, function () { return process.exit(0); });
});
client.on('error', function (err) {
    console.error(err);
    process.exit(1);
});
