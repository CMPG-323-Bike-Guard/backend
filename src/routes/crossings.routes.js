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
exports.default = crossingsRoutes;
var zod_1 = require("zod");
var errors_1 = require("../errors");
var audit_repo_1 = require("../repositories/audit.repo");
var bikes_repo_1 = require("../repositories/bikes.repo");
var events_repo_1 = require("../repositories/events.repo");
var gates_repo_1 = require("../repositories/gates.repo");
var users_repo_1 = require("../repositories/users.repo");
var realtime_1 = require("../realtime");
var views_1 = require("../services/views");
var manualCrossingSchema = zod_1.z.object({
    gateId: zod_1.z.string().uuid(),
    studentNumber: zod_1.z.string().min(1, "Enter the student's number."),
    bikeDescription: zod_1.z.string().min(1, 'Describe the bike being let through.'),
    note: zod_1.z.string().default(''),
});
function crossingsRoutes(app) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            app.get('/crossings', function (request) { return __awaiter(_this, void 0, void 0, function () {
                var q, filters, events, views, needle_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            request.requireRole('guard', 'admin');
                            q = request.query;
                            filters = {
                                gateId: q.gateId,
                                result: q.result,
                                query: q.query,
                                from: q.from,
                                to: q.to,
                                limit: q.limit ? Number(q.limit) : undefined,
                            };
                            return [4 /*yield*/, events_repo_1.eventsRepo.list(filters)];
                        case 1:
                            events = _a.sent();
                            return [4 /*yield*/, (0, views_1.toCrossingViews)(events)];
                        case 2:
                            views = _a.sent();
                            if (q.query) {
                                needle_1 = q.query.toLowerCase();
                                views = views.filter(function (v) {
                                    var _a, _b, _c, _d, _e;
                                    return ((_a = v.userName) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(needle_1)) ||
                                        ((_b = v.studentStaffNumber) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(needle_1)) ||
                                        ((_c = v.bikeName) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes(needle_1)) ||
                                        ((_d = v.event.studentNumber) === null || _d === void 0 ? void 0 : _d.toLowerCase().includes(needle_1)) ||
                                        ((_e = v.event.tagRef) === null || _e === void 0 ? void 0 : _e.toLowerCase().includes(needle_1));
                                });
                            }
                            return [2 /*return*/, views];
                    }
                });
            }); });
            app.post('/crossings/manual', function (request) { return __awaiter(_this, void 0, void 0, function () {
                var actor, body, gate, student, ownedBikes, activeBike, event, crossing;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            actor = request.requireRole('guard', 'admin');
                            body = manualCrossingSchema.parse(request.body);
                            return [4 /*yield*/, gates_repo_1.gatesRepo.findById(body.gateId)];
                        case 1:
                            gate = _d.sent();
                            if (!gate)
                                throw errors_1.ApiError.notFound('That gate is not configured.');
                            return [4 /*yield*/, users_repo_1.usersRepo.findByStudentNumber(body.studentNumber)];
                        case 2:
                            student = _d.sent();
                            if (!student)
                                throw errors_1.ApiError.badRequest('No student matches that number.', 'studentNumber');
                            return [4 /*yield*/, bikes_repo_1.bikesRepo.listForOwner(student.userId)];
                        case 3:
                            ownedBikes = _d.sent();
                            activeBike = (_b = (_a = ownedBikes.find(function (bike) { return bike.status === 'active'; })) !== null && _a !== void 0 ? _a : ownedBikes[0]) !== null && _b !== void 0 ? _b : null;
                            return [4 /*yield*/, events_repo_1.eventsRepo.create({
                                    gateId: gate.gateId,
                                    userId: student.userId,
                                    bikeId: (_c = activeBike === null || activeBike === void 0 ? void 0 : activeBike.bikeId) !== null && _c !== void 0 ? _c : null,
                                    studentNumber: student.studentStaffNumber,
                                    tagRef: null,
                                    result: 'manual',
                                    mismatchReason: null,
                                    source: 'manual_entry',
                                    guardUserId: actor.userId,
                                    verificationMs: null,
                                    offline: gate.mode === 'manual',
                                    note: "".concat(body.bikeDescription.trim()).concat(body.note.trim() ? " \u2014 ".concat(body.note.trim()) : ''),
                                })];
                        case 4:
                            event = _d.sent();
                            return [4 /*yield*/, audit_repo_1.auditRepo.record({
                                    actorUserId: actor.userId,
                                    action: 'crossing.manual',
                                    entityType: 'gate_event',
                                    entityId: event.eventId,
                                    detail: "Manually logged ".concat(student.name, " at ").concat(gate.name, ": ").concat(body.bikeDescription.trim(), "."),
                                })];
                        case 5:
                            _d.sent();
                            return [4 /*yield*/, (0, views_1.toCrossingView)(event)];
                        case 6:
                            crossing = _d.sent();
                            (0, realtime_1.emitRealtime)({ type: 'crossing', crossing: crossing });
                            return [2 /*return*/, crossing];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
