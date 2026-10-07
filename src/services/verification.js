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
exports.clearRecentScans = clearRecentScans;
exports.processCrossing = processCrossing;
var db_1 = require("../db");
var config_1 = require("../config");
var alarms_repo_1 = require("../repositories/alarms.repo");
var audit_repo_1 = require("../repositories/audit.repo");
var bikes_repo_1 = require("../repositories/bikes.repo");
var events_repo_1 = require("../repositories/events.repo");
var gates_repo_1 = require("../repositories/gates.repo");
var permissions_repo_1 = require("../repositories/permissions.repo");
var tags_repo_1 = require("../repositories/tags.repo");
var users_repo_1 = require("../repositories/users.repo");
var errors_1 = require("../errors");
var realtime_1 = require("../realtime");
var security_1 = require("../security");
var views_1 = require("./views");
var recentScans = new Map();
function clearRecentScans() {
    recentScans.clear();
}
var STUDENT_NUMBER_PATTERN = /^\d{8}$/;
function normaliseStudentNumber(raw) {
    var _a;
    var trimmed = (_a = raw === null || raw === void 0 ? void 0 : raw.trim()) !== null && _a !== void 0 ? _a : '';
    return STUDENT_NUMBER_PATTERN.test(trimmed) ? trimmed : null;
}
function scanKey(gateId, studentNumber, tagUid) {
    return [gateId, studentNumber !== null && studentNumber !== void 0 ? studentNumber : '-', tagUid ? (0, security_1.hmacIdentifier)(tagUid) : '-'].join('|');
}
function pruneRecentScans(now) {
    for (var _i = 0, recentScans_1 = recentScans; _i < recentScans_1.length; _i++) {
        var _a = recentScans_1[_i], key = _a[0], entry = _a[1];
        if (now - entry.at >= config_1.config.scanDebounceMs)
            recentScans.delete(key);
    }
}
function processCrossing(input) {
    return __awaiter(this, void 0, void 0, function () {
        var studentNumber, tagUid, source, debounce, now, key, existing, outcome, promise, err_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    studentNumber = normaliseStudentNumber(input.studentNumber);
                    tagUid = ((_a = input.tagUid) === null || _a === void 0 ? void 0 : _a.trim()) || null;
                    source = (_b = input.source) !== null && _b !== void 0 ? _b : 'automated';
                    debounce = source === 'automated' && input.debounce !== false && config_1.config.scanDebounceMs > 0;
                    if (!debounce)
                        return [2 /*return*/, evaluateCrossing(input.gateId, studentNumber, tagUid, source)];
                    now = Date.now();
                    pruneRecentScans(now);
                    key = scanKey(input.gateId, studentNumber, tagUid);
                    existing = recentScans.get(key);
                    if (!existing) return [3 /*break*/, 2];
                    return [4 /*yield*/, existing.promise];
                case 1:
                    outcome = _c.sent();
                    return [2 /*return*/, __assign(__assign({}, outcome), { duplicate: true })];
                case 2:
                    promise = evaluateCrossing(input.gateId, studentNumber, tagUid, source);
                    recentScans.set(key, { at: now, promise: promise });
                    _c.label = 3;
                case 3:
                    _c.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, promise];
                case 4: return [2 /*return*/, _c.sent()];
                case 5:
                    err_1 = _c.sent();
                    recentScans.delete(key);
                    throw err_1;
                case 6: return [2 /*return*/];
            }
        });
    });
}
function evaluateCrossing(gateId, studentNumber, tagUid, source) {
    return __awaiter(this, void 0, void 0, function () {
        var startedAt, gate, userId, bikeId, tagRefOut, mismatchReason, tagHmac, _a, person, tag, bike, accountActive, ownsIt, hasPermission, _b, isMatch, verificationMs, _c, event, alarm, _d, crossing;
        var _e;
        var _this = this;
        var _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    startedAt = Date.now();
                    return [4 /*yield*/, gates_repo_1.gatesRepo.findById(gateId)];
                case 1:
                    gate = _g.sent();
                    if (!gate)
                        throw errors_1.ApiError.notFound('That gate is not configured.');
                    if (gate.mode === 'manual') {
                        throw new errors_1.ApiError(409, 'gate_manual', 'This gate is in manual mode. Switch it back to automated first.');
                    }
                    userId = null;
                    bikeId = null;
                    tagRefOut = null;
                    mismatchReason = null;
                    if (!(!studentNumber || !tagUid)) return [3 /*break*/, 2];
                    mismatchReason = 'incomplete_read';
                    if (tagUid)
                        tagRefOut = (0, security_1.displayRef)('BG', (0, security_1.hmacIdentifier)(tagUid));
                    return [3 /*break*/, 12];
                case 2:
                    tagHmac = (0, security_1.hmacIdentifier)(tagUid);
                    tagRefOut = (0, security_1.displayRef)('BG', tagHmac);
                    return [4 /*yield*/, Promise.all([users_repo_1.usersRepo.findByStudentNumber(studentNumber), tags_repo_1.tagsRepo.findByHmac(tagHmac)])];
                case 3:
                    _a = _g.sent(), person = _a[0], tag = _a[1];
                    userId = (_f = person === null || person === void 0 ? void 0 : person.userId) !== null && _f !== void 0 ? _f : null;
                    if (!!tag) return [3 /*break*/, 4];
                    mismatchReason = 'tag_not_registered';
                    return [3 /*break*/, 12];
                case 4:
                    if (!(tag.status === 'deactivated' || tag.status === 'awaiting_collection')) return [3 /*break*/, 5];
                    mismatchReason = 'tag_deactivated';
                    bikeId = tag.bikeId;
                    return [3 /*break*/, 12];
                case 5:
                    if (!(tag.status === 'lost')) return [3 /*break*/, 6];
                    mismatchReason = 'tag_reported_lost';
                    bikeId = tag.bikeId;
                    return [3 /*break*/, 12];
                case 6:
                    if (!(tag.status === 'stolen')) return [3 /*break*/, 7];
                    mismatchReason = 'tag_reported_stolen';
                    bikeId = tag.bikeId;
                    return [3 /*break*/, 12];
                case 7: return [4 /*yield*/, bikes_repo_1.bikesRepo.findById(tag.bikeId)];
                case 8:
                    bike = _g.sent();
                    accountActive = !!person && person.accountStatus === 'active';
                    ownsIt = accountActive && !!bike && person.userId === bike.ownerUserId;
                    if (!(!ownsIt && accountActive && person && bike)) return [3 /*break*/, 10];
                    return [4 /*yield*/, permissions_repo_1.permissionsRepo.findActive(bike.bikeId, person.userId)];
                case 9:
                    _b = !!(_g.sent());
                    return [3 /*break*/, 11];
                case 10:
                    _b = false;
                    _g.label = 11;
                case 11:
                    hasPermission = _b;
                    bikeId = tag.bikeId;
                    if (!bike || !(ownsIt || hasPermission))
                        mismatchReason = 'tag_registered_to_other_user';
                    _g.label = 12;
                case 12:
                    isMatch = mismatchReason === null;
                    verificationMs = Date.now() - startedAt;
                    return [4 /*yield*/, (0, db_1.withTransaction)(function () { return __awaiter(_this, void 0, void 0, function () {
                            var created, raised, _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0: return [4 /*yield*/, events_repo_1.eventsRepo.create({
                                            gateId: gate.gateId,
                                            userId: userId,
                                            bikeId: bikeId,
                                            studentNumber: studentNumber,
                                            tagRef: tagRefOut,
                                            result: isMatch ? 'match' : 'mismatch',
                                            mismatchReason: mismatchReason,
                                            source: source,
                                            guardUserId: null,
                                            verificationMs: verificationMs,
                                            offline: false,
                                            note: null,
                                        })];
                                    case 1:
                                        created = _b.sent();
                                        if (!isMatch) return [3 /*break*/, 2];
                                        _a = null;
                                        return [3 /*break*/, 4];
                                    case 2: return [4 /*yield*/, alarms_repo_1.alarmsRepo.create(created.eventId)];
                                    case 3:
                                        _a = _b.sent();
                                        _b.label = 4;
                                    case 4:
                                        raised = _a;
                                        return [4 /*yield*/, audit_repo_1.auditRepo.record({
                                                actorUserId: userId,
                                                action: isMatch ? 'crossing.match' : 'crossing.mismatch',
                                                entityType: 'gate_event',
                                                entityId: created.eventId,
                                                detail: isMatch
                                                    ? "Match at ".concat(gate.name, " in ").concat(verificationMs, "ms.")
                                                    : "Mismatch at ".concat(gate.name, ": ").concat(mismatchReason, "."),
                                            })];
                                    case 5:
                                        _b.sent();
                                        return [2 /*return*/, { event: created, alarm: raised }];
                                }
                            });
                        }); })];
                case 13:
                    _c = _g.sent(), event = _c.event, alarm = _c.alarm;
                    if (!alarm) return [3 /*break*/, 15];
                    _d = realtime_1.emitRealtime;
                    _e = { type: 'alarm' };
                    return [4 /*yield*/, (0, views_1.buildAlarmView)(alarm)];
                case 14:
                    _d.apply(void 0, [(_e.alarm = _g.sent(), _e)]);
                    _g.label = 15;
                case 15: return [4 /*yield*/, (0, views_1.toCrossingView)(event)];
                case 16:
                    crossing = _g.sent();
                    (0, realtime_1.emitRealtime)({ type: 'crossing', crossing: crossing });
                    return [2 /*return*/, { crossing: crossing, gateShouldOpen: isMatch, alarmRaised: alarm !== null }];
            }
        });
    });
}
