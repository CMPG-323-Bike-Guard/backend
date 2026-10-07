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
exports.alarmsRepo = void 0;
var db_1 = require("../db");
function toAlarm(row) {
    return {
        alarmId: row.alarm_id,
        eventId: row.event_id,
        status: row.status,
        raisedAt: new Date(row.raised_at).toISOString(),
        escalatedAt: row.escalated_at ? new Date(row.escalated_at).toISOString() : null,
        resolvedByUserId: row.resolved_by_user_id,
        resolvedAt: row.resolved_at ? new Date(row.resolved_at).toISOString() : null,
        notes: row.notes,
    };
}
exports.alarmsRepo = {
    findById: function (alarmId) {
        return __awaiter(this, void 0, void 0, function () {
            var row;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, db_1.queryOne)('SELECT * FROM alarms WHERE alarm_id = $1', [alarmId])];
                    case 1:
                        row = _a.sent();
                        return [2 /*return*/, row ? toAlarm(row) : null];
                }
            });
        });
    },
    findByEventId: function (eventId) {
        return __awaiter(this, void 0, void 0, function () {
            var row;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, db_1.queryOne)('SELECT * FROM alarms WHERE event_id = $1', [eventId])];
                    case 1:
                        row = _a.sent();
                        return [2 /*return*/, row ? toAlarm(row) : null];
                }
            });
        });
    },
    create: function (eventId) {
        return __awaiter(this, void 0, void 0, function () {
            var row;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, db_1.queryOne)("INSERT INTO alarms (event_id) VALUES ($1) RETURNING *", [eventId])];
                    case 1:
                        row = _a.sent();
                        return [2 /*return*/, toAlarm(row)];
                }
            });
        });
    },
    list: function () {
        return __awaiter(this, arguments, void 0, function (scope) {
            var rows, _a;
            if (scope === void 0) { scope = 'live'; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(scope === 'live')) return [3 /*break*/, 2];
                        return [4 /*yield*/, (0, db_1.query)("SELECT * FROM alarms WHERE status IN ('open','escalated') ORDER BY raised_at DESC LIMIT 20")];
                    case 1:
                        _a = _b.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, (0, db_1.query)("SELECT * FROM alarms ORDER BY raised_at DESC LIMIT 100")];
                    case 3:
                        _a = _b.sent();
                        _b.label = 4;
                    case 4:
                        rows = _a;
                        return [2 /*return*/, rows.map(toAlarm)];
                }
            });
        });
    },
    resolve: function (alarmId, outcome, notes, guardUserId) {
        return __awaiter(this, void 0, void 0, function () {
            var row, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(outcome === 'escalated')) return [3 /*break*/, 2];
                        return [4 /*yield*/, (0, db_1.queryOne)("UPDATE alarms SET status = $1, notes = $2, escalated_at = now() WHERE alarm_id = $3 RETURNING *", [outcome, notes, alarmId])];
                    case 1:
                        _a = _b.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, (0, db_1.queryOne)("UPDATE alarms SET status = $1, notes = $2, resolved_by_user_id = $3, resolved_at = now()\n             WHERE alarm_id = $4 RETURNING *", [outcome, notes, guardUserId, alarmId])];
                    case 3:
                        _a = _b.sent();
                        _b.label = 4;
                    case 4:
                        row = _a;
                        return [2 /*return*/, row ? toAlarm(row) : null];
                }
            });
        });
    },
};
