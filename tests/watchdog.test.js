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
var vitest_1 = require("vitest");
var gates_repo_1 = require("../src/repositories/gates.repo");
var gate_watchdog_1 = require("../src/services/gate-watchdog");
var helpers_1 = require("./helpers");
var gateId;
var t0 = 1800000000000;
(0, vitest_1.beforeEach)(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, helpers_1.resetDb)()];
            case 1:
                _a.sent();
                return [4 /*yield*/, (0, helpers_1.makeGate)()];
            case 2:
                gateId = _a.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, vitest_1.describe)('gate watchdog', function () {
    (0, vitest_1.it)('leaves a gate alone while it keeps reporting', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    (0, gate_watchdog_1.recordHeartbeat)(gateId, t0);
                    _a = vitest_1.expect;
                    return [4 /*yield*/, (0, gate_watchdog_1.checkGateHealth)(t0 + 20000)];
                case 1:
                    _a.apply(void 0, [_c.sent()]).toEqual([]);
                    _b = vitest_1.expect;
                    return [4 /*yield*/, gates_repo_1.gatesRepo.findById(gateId)];
                case 2:
                    _b.apply(void 0, [(_c.sent()).mode]).toBe('automated');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)('switches a silent gate to manual and records an audit entry', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, gate, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    (0, gate_watchdog_1.recordHeartbeat)(gateId, t0);
                    _a = vitest_1.expect;
                    return [4 /*yield*/, (0, gate_watchdog_1.checkGateHealth)(t0 + 45000)];
                case 1:
                    _a.apply(void 0, [_c.sent()]).toEqual([gateId]);
                    return [4 /*yield*/, gates_repo_1.gatesRepo.findById(gateId)];
                case 2:
                    gate = _c.sent();
                    (0, vitest_1.expect)(gate.mode).toBe('manual');
                    (0, vitest_1.expect)(gate.health).toBe('error');
                    _b = vitest_1.expect;
                    return [4 /*yield*/, (0, helpers_1.countRows)('audit_log')];
                case 3:
                    _b.apply(void 0, [_c.sent()]).toBe(1);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)('does not flip it again on the next check', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    (0, gate_watchdog_1.recordHeartbeat)(gateId, t0);
                    return [4 /*yield*/, (0, gate_watchdog_1.checkGateHealth)(t0 + 45000)];
                case 1:
                    _c.sent();
                    _a = vitest_1.expect;
                    return [4 /*yield*/, (0, gate_watchdog_1.checkGateHealth)(t0 + 60000)];
                case 2:
                    _a.apply(void 0, [_c.sent()]).toEqual([]);
                    _b = vitest_1.expect;
                    return [4 /*yield*/, (0, helpers_1.countRows)('audit_log')];
                case 3:
                    _b.apply(void 0, [_c.sent()]).toBe(1);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)('ignores gates that have never reported (no reader installed yet)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _a = vitest_1.expect;
                    return [4 /*yield*/, (0, gate_watchdog_1.checkGateHealth)(t0 + 600000)];
                case 1:
                    _a.apply(void 0, [_c.sent()]).toEqual([]);
                    _b = vitest_1.expect;
                    return [4 /*yield*/, gates_repo_1.gatesRepo.findById(gateId)];
                case 2:
                    _b.apply(void 0, [(_c.sent()).mode]).toBe('automated');
                    return [2 /*return*/];
            }
        });
    }); });
});
