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
var vitest_1 = require("vitest");
var db_1 = require("../src/db");
var permissions_repo_1 = require("../src/repositories/permissions.repo");
var verification_1 = require("../src/services/verification");
var helpers_1 = require("./helpers");
var gateId;
var ownerId;
var otherId;
var bikeId;
(0, vitest_1.beforeEach)(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, helpers_1.resetDb)()];
            case 1:
                _a.sent();
                return [4 /*yield*/, (0, helpers_1.makeGate)()];
            case 2:
                gateId = _a.sent();
                return [4 /*yield*/, (0, helpers_1.makeUser)('30000001')];
            case 3:
                ownerId = _a.sent();
                return [4 /*yield*/, (0, helpers_1.makeUser)('30000002')];
            case 4:
                otherId = _a.sent();
                return [4 /*yield*/, (0, helpers_1.makeBike)(ownerId)];
            case 5:
                bikeId = _a.sent();
                return [4 /*yield*/, (0, helpers_1.makeTag)(bikeId, 'TAG-ACTIVE')];
            case 6:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
var scan = function (studentNumber, tagUid, extra) {
    if (extra === void 0) { extra = {}; }
    return (0, verification_1.processCrossing)(__assign({ gateId: gateId, studentNumber: studentNumber, tagUid: tagUid, debounce: false }, extra));
};
(0, vitest_1.describe)('processCrossing decisions', function () {
    (0, vitest_1.it)('opens the gate for the owner with their own tag', function () { return __awaiter(void 0, void 0, void 0, function () {
        var outcome, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, scan('30000001', 'TAG-ACTIVE')];
                case 1:
                    outcome = _b.sent();
                    (0, vitest_1.expect)(outcome.gateShouldOpen).toBe(true);
                    (0, vitest_1.expect)(outcome.alarmRaised).toBe(false);
                    (0, vitest_1.expect)(outcome.crossing.event.result).toBe('match');
                    (0, vitest_1.expect)(outcome.crossing.event.bikeId).toBe(bikeId);
                    (0, vitest_1.expect)(outcome.crossing.event.studentNumber).toBe('30000001'); // <- add this line
                    _a = vitest_1.expect;
                    return [4 /*yield*/, (0, helpers_1.countRows)('alarms')];
                case 2:
                    _a.apply(void 0, [_b.sent()]).toBe(0);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)('opens the gate for a user with an active permission on the bike', function () { return __awaiter(void 0, void 0, void 0, function () {
        var outcome;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, permissions_repo_1.permissionsRepo.create({ bikeId: bikeId, authorisedUserId: otherId, grantedBy: ownerId })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, scan('30000002', 'TAG-ACTIVE')];
                case 2:
                    outcome = _a.sent();
                    (0, vitest_1.expect)(outcome.gateShouldOpen).toBe(true);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)('flags a tag registered to someone else', function () { return __awaiter(void 0, void 0, void 0, function () {
        var outcome;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, scan('30000002', 'TAG-ACTIVE')];
                case 1:
                    outcome = _a.sent();
                    (0, vitest_1.expect)(outcome.gateShouldOpen).toBe(false);
                    (0, vitest_1.expect)(outcome.alarmRaised).toBe(true);
                    (0, vitest_1.expect)(outcome.crossing.event.mismatchReason).toBe('tag_registered_to_other_user');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)('flags an unknown card presenting a real tag', function () { return __awaiter(void 0, void 0, void 0, function () {
        var outcome;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, scan('39999999', 'TAG-ACTIVE')];
                case 1:
                    outcome = _a.sent();
                    (0, vitest_1.expect)(outcome.crossing.event.mismatchReason).toBe('tag_registered_to_other_user');
                    (0, vitest_1.expect)(outcome.crossing.event.userId).toBeNull();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)('flags a tag that was never registered', function () { return __awaiter(void 0, void 0, void 0, function () {
        var outcome;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, scan('30000001', 'TAG-NOPE')];
                case 1:
                    outcome = _a.sent();
                    (0, vitest_1.expect)(outcome.crossing.event.mismatchReason).toBe('tag_not_registered');
                    (0, vitest_1.expect)(outcome.crossing.event.bikeId).toBeNull();
                    return [2 /*return*/];
            }
        });
    }); });
    vitest_1.it.each([
        ['lost', 'tag_reported_lost'],
        ['stolen', 'tag_reported_stolen'],
        ['deactivated', 'tag_deactivated'],
        ['awaiting_collection', 'tag_deactivated'],
    ])('maps a %s tag to %s', function (status, reason) { return __awaiter(void 0, void 0, void 0, function () {
        var outcome;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, db_1.query)('UPDATE rfid_tags SET status = $1', [status])];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, scan('30000001', 'TAG-ACTIVE')];
                case 2:
                    outcome = _a.sent();
                    (0, vitest_1.expect)(outcome.gateShouldOpen).toBe(false);
                    (0, vitest_1.expect)(outcome.crossing.event.mismatchReason).toBe(reason);
                    (0, vitest_1.expect)(outcome.crossing.event.bikeId).toBe(bikeId);
                    return [2 /*return*/];
            }
        });
    }); });
    vitest_1.it.each([
        ['card only', '30000001', null],
        ['tag only', null, 'TAG-ACTIVE'],
        ['nothing', null, null],
        ['blank strings', '  ', ' '],
        ['letters instead of digits', 'abcdefgh', 'TAG-ACTIVE'],
        ['seven digits', '3000000', 'TAG-ACTIVE'],
        ['nine digits', '300000012', 'TAG-ACTIVE'],
        ['digits with a space inside', '3000 0001', 'TAG-ACTIVE'],
    ])('treats %s as an incomplete read', function (_name, card, tag) { return __awaiter(void 0, void 0, void 0, function () {
        var outcome;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, scan(card, tag)];
                case 1:
                    outcome = _a.sent();
                    (0, vitest_1.expect)(outcome.crossing.event.mismatchReason).toBe('incomplete_read');
                    (0, vitest_1.expect)(outcome.alarmRaised).toBe(true);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)('flags a suspended account even when the tag is theirs', function () { return __awaiter(void 0, void 0, void 0, function () {
        var outcome;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, db_1.query)("UPDATE users SET account_status = 'suspended' WHERE user_id = $1", [ownerId])];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, scan('30000001', 'TAG-ACTIVE')];
                case 2:
                    outcome = _a.sent();
                    (0, vitest_1.expect)(outcome.gateShouldOpen).toBe(false);
                    (0, vitest_1.expect)(outcome.crossing.event.mismatchReason).toBe('tag_registered_to_other_user');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)('stores the student number as read, in plain text, and only a display reference for the tag', function () { return __awaiter(void 0, void 0, void 0, function () {
        var rows;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, scan('30000001', 'TAG-ACTIVE')];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, (0, db_1.query)('SELECT student_number, tag_ref FROM gate_events')];
                case 2:
                    rows = _a.sent();
                    (0, vitest_1.expect)(rows[0].student_number).toBe('30000001');
                    (0, vitest_1.expect)(rows[0].tag_ref).toMatch(/^BG-[0-9A-F]{6}$/);
                    (0, vitest_1.expect)(rows[0].tag_ref).not.toContain('TAG-ACTIVE');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)('rejects scans for a gate in manual mode', function () { return __awaiter(void 0, void 0, void 0, function () {
        var manualGate, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, helpers_1.makeGate)('manual')];
                case 1:
                    manualGate = _b.sent();
                    return [4 /*yield*/, (0, vitest_1.expect)((0, verification_1.processCrossing)({ gateId: manualGate, studentNumber: '30000001', tagUid: 'TAG-ACTIVE', debounce: false })).rejects.toMatchObject({ statusCode: 409, code: 'gate_manual' })];
                case 2:
                    _b.sent();
                    _a = vitest_1.expect;
                    return [4 /*yield*/, (0, helpers_1.countRows)('gate_events')];
                case 3:
                    _a.apply(void 0, [_b.sent()]).toBe(0);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)('rejects scans for an unknown gate', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, vitest_1.expect)((0, verification_1.processCrossing)({
                        gateId: '00000000-0000-4000-8000-000000000000',
                        studentNumber: '30000001',
                        tagUid: 'TAG-ACTIVE',
                        debounce: false,
                    })).rejects.toMatchObject({ statusCode: 404 })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)('writes event, alarm and audit entry together for a mismatch', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, scan('30000002', 'TAG-ACTIVE')];
                case 1:
                    _d.sent();
                    _a = vitest_1.expect;
                    return [4 /*yield*/, (0, helpers_1.countRows)('gate_events')];
                case 2:
                    _a.apply(void 0, [_d.sent()]).toBe(1);
                    _b = vitest_1.expect;
                    return [4 /*yield*/, (0, helpers_1.countRows)('alarms')];
                case 3:
                    _b.apply(void 0, [_d.sent()]).toBe(1);
                    _c = vitest_1.expect;
                    return [4 /*yield*/, (0, helpers_1.countRows)('audit_log')];
                case 4:
                    _c.apply(void 0, [_d.sent()]).toBe(1);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)('rolls everything back when the audit write fails', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_1.query)("ALTER TABLE audit_log ADD CONSTRAINT force_fail CHECK (action <> 'crossing.mismatch')")];
                case 1:
                    _c.sent();
                    _c.label = 2;
                case 2:
                    _c.trys.push([2, , 6, 8]);
                    return [4 /*yield*/, (0, vitest_1.expect)(scan('30000002', 'TAG-ACTIVE')).rejects.toThrow()];
                case 3:
                    _c.sent();
                    _a = vitest_1.expect;
                    return [4 /*yield*/, (0, helpers_1.countRows)('gate_events')];
                case 4:
                    _a.apply(void 0, [_c.sent()]).toBe(0);
                    _b = vitest_1.expect;
                    return [4 /*yield*/, (0, helpers_1.countRows)('alarms')];
                case 5:
                    _b.apply(void 0, [_c.sent()]).toBe(0);
                    return [3 /*break*/, 8];
                case 6: return [4 /*yield*/, (0, db_1.query)('ALTER TABLE audit_log DROP CONSTRAINT force_fail')];
                case 7:
                    _c.sent();
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/];
            }
        });
    }); });
});
(0, vitest_1.describe)('scan debounce', function () {
    (0, vitest_1.it)('returns the first outcome for a repeated identical scan without a second event or alarm', function () { return __awaiter(void 0, void 0, void 0, function () {
        var first, second, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, verification_1.processCrossing)({ gateId: gateId, studentNumber: '30000002', tagUid: 'TAG-ACTIVE' })];
                case 1:
                    first = _c.sent();
                    return [4 /*yield*/, (0, verification_1.processCrossing)({ gateId: gateId, studentNumber: '30000002', tagUid: 'TAG-ACTIVE' })];
                case 2:
                    second = _c.sent();
                    (0, vitest_1.expect)(first.duplicate).toBeUndefined();
                    (0, vitest_1.expect)(second.duplicate).toBe(true);
                    (0, vitest_1.expect)(second.crossing.event.eventId).toBe(first.crossing.event.eventId);
                    _a = vitest_1.expect;
                    return [4 /*yield*/, (0, helpers_1.countRows)('gate_events')];
                case 3:
                    _a.apply(void 0, [_c.sent()]).toBe(1);
                    _b = vitest_1.expect;
                    return [4 /*yield*/, (0, helpers_1.countRows)('alarms')];
                case 4:
                    _b.apply(void 0, [_c.sent()]).toBe(1);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)('collapses concurrent identical scans into one event', function () { return __awaiter(void 0, void 0, void 0, function () {
        var results, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, Promise.all(Array.from({ length: 5 }, function () { return (0, verification_1.processCrossing)({ gateId: gateId, studentNumber: '30000002', tagUid: 'TAG-ACTIVE' }); }))];
                case 1:
                    results = _b.sent();
                    (0, vitest_1.expect)(new Set(results.map(function (r) { return r.crossing.event.eventId; })).size).toBe(1);
                    _a = vitest_1.expect;
                    return [4 /*yield*/, (0, helpers_1.countRows)('gate_events')];
                case 2:
                    _a.apply(void 0, [_b.sent()]).toBe(1);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)('treats a different card or tag as a separate scan', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, verification_1.processCrossing)({ gateId: gateId, studentNumber: '30000002', tagUid: 'TAG-ACTIVE' })];
                case 1:
                    _b.sent();
                    return [4 /*yield*/, (0, verification_1.processCrossing)({ gateId: gateId, studentNumber: '30000001', tagUid: 'TAG-ACTIVE' })];
                case 2:
                    _b.sent();
                    _a = vitest_1.expect;
                    return [4 /*yield*/, (0, helpers_1.countRows)('gate_events')];
                case 3:
                    _a.apply(void 0, [_b.sent()]).toBe(2);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)('does not cache a failed scan', function () { return __awaiter(void 0, void 0, void 0, function () {
        var manualGate, input, outcome;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, helpers_1.makeGate)('manual')];
                case 1:
                    manualGate = _a.sent();
                    input = { gateId: manualGate, studentNumber: '30000001', tagUid: 'TAG-ACTIVE' };
                    return [4 /*yield*/, (0, vitest_1.expect)((0, verification_1.processCrossing)(input)).rejects.toMatchObject({ code: 'gate_manual' })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, (0, db_1.query)("UPDATE gates SET mode = 'automated' WHERE gate_id = $1", [manualGate])];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, (0, verification_1.processCrossing)(input)];
                case 4:
                    outcome = _a.sent();
                    (0, vitest_1.expect)(outcome.gateShouldOpen).toBe(true);
                    return [2 /*return*/];
            }
        });
    }); });
});
