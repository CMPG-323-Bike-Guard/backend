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
exports.recordHeartbeat = recordHeartbeat;
exports.resetWatchdogState = resetWatchdogState;
exports.checkGateHealth = checkGateHealth;
exports.startGateWatchdog = startGateWatchdog;
var audit_repo_1 = require("../repositories/audit.repo");
var gates_repo_1 = require("../repositories/gates.repo");
var config_1 = require("../config");
var realtime_1 = require("../realtime");
var lastSeen = new Map();
function recordHeartbeat(gateId, now) {
    if (now === void 0) { now = Date.now(); }
    lastSeen.set(gateId, now);
}
function resetWatchdogState() {
    lastSeen.clear();
}
function checkGateHealth() {
    return __awaiter(this, arguments, void 0, function (now) {
        var flipped, gates, _i, gates_1, gate, seenAt, updated;
        if (now === void 0) { now = Date.now(); }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    flipped = [];
                    return [4 /*yield*/, gates_repo_1.gatesRepo.list()];
                case 1:
                    gates = _a.sent();
                    _i = 0, gates_1 = gates;
                    _a.label = 2;
                case 2:
                    if (!(_i < gates_1.length)) return [3 /*break*/, 6];
                    gate = gates_1[_i];
                    seenAt = lastSeen.get(gate.gateId);
                    if (seenAt === undefined)
                        return [3 /*break*/, 5];
                    if (gate.mode !== 'automated')
                        return [3 /*break*/, 5];
                    if (now - seenAt <= config_1.config.gateOfflineAfterMs)
                        return [3 /*break*/, 5];
                    return [4 /*yield*/, gates_repo_1.gatesRepo.setMode(gate.gateId, 'manual', 'error', new Date(now))];
                case 3:
                    updated = _a.sent();
                    if (!updated)
                        return [3 /*break*/, 5];
                    return [4 /*yield*/, audit_repo_1.auditRepo.record({
                            actorUserId: null,
                            action: 'gate.reader_offline',
                            entityType: 'gate',
                            entityId: gate.gateId,
                            detail: "".concat(gate.name, " stopped reporting for ").concat(Math.round((now - seenAt) / 1000), "s and was switched to manual checks."),
                        })];
                case 4:
                    _a.sent();
                    (0, realtime_1.emitRealtime)({ type: 'gate', gate: updated });
                    flipped.push(gate.gateId);
                    _a.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 2];
                case 6: return [2 /*return*/, flipped];
            }
        });
    });
}
function startGateWatchdog(onError) {
    var timer = setInterval(function () {
        checkGateHealth().catch(onError);
    }, config_1.config.gateWatchdogIntervalMs);
    timer.unref();
    return timer;
}
