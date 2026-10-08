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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildStats = buildStats;
exports.buildReports = buildReports;
var alarms_repo_1 = require("../repositories/alarms.repo");
var bikes_repo_1 = require("../repositories/bikes.repo");
var events_repo_1 = require("../repositories/events.repo");
var gates_repo_1 = require("../repositories/gates.repo");
var users_repo_1 = require("../repositories/users.repo");
function percentile(values, fraction) {
    if (values.length === 0)
        return 0;
    var sorted = __spreadArray([], values, true).sort(function (a, b) { return a - b; });
    var index = Math.min(sorted.length - 1, Math.floor(sorted.length * fraction));
    return sorted[index];
}
function buildStats() {
    return __awaiter(this, void 0, void 0, function () {
        var startOfDay, _a, today, allEvents, gates, bikes, alarms, durations, automated, incomplete;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    startOfDay = new Date();
                    startOfDay.setHours(0, 0, 0, 0);
                    return [4 /*yield*/, Promise.all([
                            events_repo_1.eventsRepo.listSince(startOfDay),
                            events_repo_1.eventsRepo.listAll(),
                            gates_repo_1.gatesRepo.list(),
                            bikes_repo_1.bikesRepo.listByStatus(),
                        ])];
                case 1:
                    _a = _b.sent(), today = _a[0], allEvents = _a[1], gates = _a[2], bikes = _a[3];
                    return [4 /*yield*/, alarms_repo_1.alarmsRepo.list('all')];
                case 2:
                    alarms = _b.sent();
                    durations = allEvents
                        .map(function (event) { return event.verificationMs; })
                        .filter(function (value) { return typeof value === 'number'; });
                    automated = allEvents.filter(function (event) { return event.source === 'automated'; });
                    incomplete = automated.filter(function (event) { return event.mismatchReason === 'incomplete_read'; });
                    return [2 /*return*/, {
                            crossingsToday: today.length,
                            matchesToday: today.filter(function (event) { return event.result === 'match'; }).length,
                            mismatchesToday: today.filter(function (event) { return event.result === 'mismatch'; }).length,
                            openAlarms: alarms.filter(function (alarm) { return alarm.status === 'open' || alarm.status === 'escalated'; }).length,
                            manualGates: gates.filter(function (gate) { return gate.mode === 'manual'; }).length,
                            registeredBikes: bikes.filter(function (bike) { return bike.status === 'active'; }).length,
                            pendingRegistrations: bikes.filter(function (bike) { return bike.status === 'pending_approval'; }).length,
                            medianVerificationMs: percentile(durations, 0.5),
                            p95VerificationMs: percentile(durations, 0.95),
                            readSuccessRate: automated.length === 0 ? 100 : 100 - (incomplete.length / automated.length) * 100,
                        }];
            }
        });
    });
}
function buildReports(days) {
    return __awaiter(this, void 0, void 0, function () {
        var cutoff, _a, scoped, bikes, usersById, userIds, byDay, byHour, bucket, repeats, uptake, _loop_1, offset;
        var _b;
        var _this = this;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    cutoff = new Date(Date.now() - days * 86400000);
                    return [4 /*yield*/, Promise.all([events_repo_1.eventsRepo.listSince(cutoff), bikes_repo_1.bikesRepo.listByStatus()])];
                case 1:
                    _a = _c.sent(), scoped = _a[0], bikes = _a[1];
                    usersById = new Map();
                    userIds = __spreadArray([], new Set(scoped.map(function (event) { return event.userId; }).filter(function (id) { return !!id; })), true);
                    return [4 /*yield*/, Promise.all(userIds.map(function (id) { return __awaiter(_this, void 0, void 0, function () {
                            var _a, _b, _c;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        _b = (_a = usersById).set;
                                        _c = [id];
                                        return [4 /*yield*/, users_repo_1.usersRepo.findById(id)];
                                    case 1:
                                        _b.apply(_a, _c.concat([_d.sent()]));
                                        return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 2:
                    _c.sent();
                    byDay = new Map();
                    byHour = new Map();
                    bucket = function (event) {
                        if (event.result === 'match')
                            return 'matches';
                        if (event.result === 'mismatch')
                            return 'mismatches';
                        return 'manual';
                    };
                    scoped.forEach(function (event) {
                        var _a, _b;
                        var date = new Date(event.timestamp);
                        var dayKey = date.toISOString().slice(0, 10);
                        var dayLabel = date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' });
                        var day = (_a = byDay.get(dayKey)) !== null && _a !== void 0 ? _a : { label: dayLabel, matches: 0, mismatches: 0, manual: 0 };
                        var hourKey = date.getHours();
                        var hour = (_b = byHour.get(hourKey)) !== null && _b !== void 0 ? _b : {
                            label: "".concat(hourKey.toString().padStart(2, '0'), ":00"),
                            matches: 0,
                            mismatches: 0,
                            manual: 0,
                        };
                        day[bucket(event)] += 1;
                        hour[bucket(event)] += 1;
                        byDay.set(dayKey, day);
                        byHour.set(hourKey, hour);
                    });
                    repeats = new Map();
                    scoped
                        .filter(function (event) { return event.result === 'mismatch'; })
                        .forEach(function (event) {
                        var _a, _b, _c, _d, _e, _f, _g;
                        var user = event.userId ? usersById.get(event.userId) : null;
                        var key = (_a = user === null || user === void 0 ? void 0 : user.userId) !== null && _a !== void 0 ? _a : "unidentified:".concat((_c = (_b = event.studentNumber) !== null && _b !== void 0 ? _b : event.tagRef) !== null && _c !== void 0 ? _c : event.eventId);
                        var row = (_d = repeats.get(key)) !== null && _d !== void 0 ? _d : {
                            userId: (_e = user === null || user === void 0 ? void 0 : user.userId) !== null && _e !== void 0 ? _e : null,
                            name: (_f = user === null || user === void 0 ? void 0 : user.name) !== null && _f !== void 0 ? _f : 'Unidentified person',
                            studentStaffNumber: (_g = user === null || user === void 0 ? void 0 : user.studentStaffNumber) !== null && _g !== void 0 ? _g : ',',
                            count: 0,
                            lastSeen: event.timestamp,
                            reasons: [],
                        };
                        row.count += 1;
                        row.lastSeen = event.timestamp > row.lastSeen ? event.timestamp : row.lastSeen;
                        var reason = event.mismatchReason;
                        if (reason && !row.reasons.includes(reason))
                            row.reasons.push(reason);
                        repeats.set(key, row);
                    });
                    uptake = [];
                    _loop_1 = function (offset) {
                        var edge = Date.now() - offset * 86400000;
                        uptake.push({
                            label: new Date(edge).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' }),
                            registered: bikes.filter(function (bike) { return bike.status === 'active' && new Date(bike.submittedAt).getTime() <= edge; })
                                .length,
                        });
                    };
                    for (offset = days - 1; offset >= 0; offset -= 1) {
                        _loop_1(offset);
                    }
                    _b = {};
                    return [4 /*yield*/, buildStats()];
                case 3: return [2 /*return*/, (_b.stats = _c.sent(),
                        _b.throughputByDay = __spreadArray([], byDay.entries(), true).sort(function (_a, _b) {
                            var a = _a[0];
                            var b = _b[0];
                            return a.localeCompare(b);
                        }).map(function (_a) {
                            var v = _a[1];
                            return v;
                        }),
                        _b.throughputByHour = __spreadArray([], byHour.entries(), true).sort(function (_a, _b) {
                            var a = _a[0];
                            var b = _b[0];
                            return a - b;
                        }).map(function (_a) {
                            var v = _a[1];
                            return v;
                        }),
                        _b.repeatMismatches = __spreadArray([], repeats.values(), true).filter(function (row) { return row.count > 1; }).sort(function (a, b) { return b.count - a.count; }),
                        _b.registrationUptake = uptake,
                        _b)];
            }
        });
    });
}
