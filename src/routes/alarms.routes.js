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
exports.default = alarmsRoutes;
var zod_1 = require("zod");
var errors_1 = require("../errors");
var alarms_repo_1 = require("../repositories/alarms.repo");
var audit_repo_1 = require("../repositories/audit.repo");
var realtime_1 = require("../realtime");
var views_1 = require("../services/views");
var resolveSchema = zod_1.z.object({
    outcome: zod_1.z.enum(['cleared_in_person', 'reported_stolen', 'escalated']),
    notes: zod_1.z.string().default(''),
});
function alarmsRoutes(app) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            app.get('/alarms', function (request) { return __awaiter(_this, void 0, void 0, function () {
                var alarms;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            request.requireRole('guard', 'admin');
                            return [4 /*yield*/, alarms_repo_1.alarmsRepo.list((_a = request.query.status) !== null && _a !== void 0 ? _a : 'live')];
                        case 1:
                            alarms = _b.sent();
                            return [2 /*return*/, Promise.all(alarms.map(views_1.buildAlarmView))];
                    }
                });
            }); });
            app.post('/alarms/:alarmId/resolution', function (request) { return __awaiter(_this, void 0, void 0, function () {
                var actor, body, alarm, updated, view;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            actor = request.requireRole('guard', 'admin');
                            body = resolveSchema.parse(request.body);
                            return [4 /*yield*/, alarms_repo_1.alarmsRepo.findById(request.params.alarmId)];
                        case 1:
                            alarm = _a.sent();
                            if (!alarm)
                                throw errors_1.ApiError.notFound('That alarm has already been closed.');
                            if (alarm.status !== 'open' && alarm.status !== 'escalated') {
                                throw errors_1.ApiError.conflict('That alarm has already been resolved.');
                            }
                            return [4 /*yield*/, alarms_repo_1.alarmsRepo.resolve(alarm.alarmId, body.outcome, body.notes.trim() || null, actor.userId)];
                        case 2:
                            updated = _a.sent();
                            return [4 /*yield*/, audit_repo_1.auditRepo.record({
                                    actorUserId: actor.userId,
                                    action: "alarm.".concat(body.outcome),
                                    entityType: 'alarm',
                                    entityId: alarm.alarmId,
                                    detail: body.notes.trim() || 'No additional notes.',
                                })];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, (0, views_1.buildAlarmView)(updated)];
                        case 4:
                            view = _a.sent();
                            (0, realtime_1.emitRealtime)({ type: 'alarm-updated', alarm: view });
                            return [2 /*return*/, view];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
