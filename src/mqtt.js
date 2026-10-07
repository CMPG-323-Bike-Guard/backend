"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startGateBridge = startGateBridge;
var mqtt_1 = require("mqtt");
var zod_1 = require("zod");
var config_1 = require("./config");
var errors_1 = require("./errors");
var gate_auth_1 = require("./gate-auth");
var gates_repo_1 = require("./repositories/gates.repo");
var realtime_1 = require("./realtime");
var gate_watchdog_1 = require("./services/gate-watchdog");
var verification_1 = require("./services/verification");
var payloadSchema = zod_1.z.object({
    studentNumber: zod_1.z.string().nullable().optional(),
    tagUid: zod_1.z.string().nullable().optional(),
    ts: zod_1.z.number().optional(),
    sig: zod_1.z.string().optional(),
});
var uuidSchema = zod_1.z.string().uuid();
function startGateBridge(log) {
    var _this = this;
    if (!config_1.config.mqttUrl) {
        log.info('MQTT_URL not set — gate bridge disabled (REST /dev/simulate-crossing still works).');
        return;
    }
    var client = mqtt_1.default.connect(config_1.config.mqttUrl, {
        username: config_1.config.mqttUsername,
        password: config_1.config.mqttPassword,
        reconnectPeriod: 2000,
    });
    var prefix = config_1.config.mqttTopicPrefix;
    var scanTopic = "".concat(prefix, "/+/scan");
    var heartbeatTopic = "".concat(prefix, "/+/heartbeat");
    (0, gate_watchdog_1.startGateWatchdog)(function (err) { return log.error({ err: err }, 'Gate watchdog check failed'); });
    client.on('connect', function () {
        log.info("Gate bridge connected to MQTT broker, subscribing to ".concat(scanTopic, " and ").concat(heartbeatTopic));
        client.subscribe([scanTopic, heartbeatTopic]);
    });
    client.on('message', function (topic, raw) { return __awaiter(_this, void 0, void 0, function () {
        var parts, kind, gateId, payload, decisionTopic, outcome, err_1, failed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    parts = topic.split('/');
                    kind = parts[parts.length - 1];
                    gateId = parts[parts.length - 2];
                    if (!uuidSchema.safeParse(gateId).success) {
                        log.warn({ topic: topic }, 'Gate bridge ignored a message for a malformed gate id.');
                        return [2 /*return*/];
                    }
                    try {
                        payload = payloadSchema.parse(JSON.parse(raw.toString()));
                    }
                    catch (_b) {
                        log.warn({ gateId: gateId }, 'Gate bridge ignored a malformed payload.');
                        return [2 /*return*/];
                    }
                    if (!(0, gate_auth_1.verifyPayload)(gateId, payload)) {
                        log.warn({ gateId: gateId, kind: kind }, 'Gate bridge rejected a message with a bad, stale or replayed signature.');
                        return [2 /*return*/];
                    }
                    (0, gate_watchdog_1.recordHeartbeat)(gateId);
                    if (kind === 'heartbeat')
                        return [2 /*return*/];
                    decisionTopic = "".concat(prefix, "/").concat(gateId, "/decision");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 5]);
                    return [4 /*yield*/, (0, verification_1.processCrossing)({
                            gateId: gateId,
                            studentNumber: payload.studentNumber,
                            tagUid: payload.tagUid,
                            source: 'automated',
                        })];
                case 2:
                    outcome = _a.sent();
                    client.publish(decisionTopic, JSON.stringify({ open: outcome.gateShouldOpen, eventId: outcome.crossing.event.eventId }));
                    return [3 /*break*/, 5];
                case 3:
                    err_1 = _a.sent();
                    client.publish(decisionTopic, JSON.stringify({ open: false, eventId: null }));
                    if (err_1 instanceof errors_1.ApiError) {
                        log.warn({ gateId: gateId, code: err_1.code }, 'Gate bridge could not verify a scan.');
                        return [2 /*return*/];
                    }
                    log.error({ err: err_1, gateId: gateId }, 'Gate bridge failed to process a scan — falling back the lane to manual mode.');
                    return [4 /*yield*/, gates_repo_1.gatesRepo.setMode(gateId, 'manual', 'error', new Date()).catch(function () { return null; })];
                case 4:
                    failed = _a.sent();
                    if (failed)
                        (0, realtime_1.emitRealtime)({ type: 'gate', gate: failed });
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); });
    client.on('error', function (err) { return log.error({ err: err }, 'MQTT client error'); });
}
