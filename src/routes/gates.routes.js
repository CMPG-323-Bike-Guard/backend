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
exports.default = gatesRoutes;
var zod_1 = require("zod");
var errors_1 = require("../errors");
var audit_repo_1 = require("../repositories/audit.repo");
var gates_repo_1 = require("../repositories/gates.repo");
var realtime_1 = require("../realtime");
var setModeSchema = zod_1.z.object({ mode: zod_1.z.enum(['automated', 'manual']) });
function gatesRoutes(app) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            app.get('/gates', function (request) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    request.requireAuth();
                    return [2 /*return*/, gates_repo_1.gatesRepo.list()];
                });
            }); });
            app.patch('/gates/:gateId/mode', function (request) { return __awaiter(_this, void 0, void 0, function () {
                var actor, body, gate, health, updated;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            actor = request.requireRole('guard', 'admin');
                            body = setModeSchema.parse(request.body);
                            return [4 /*yield*/, gates_repo_1.gatesRepo.findById(request.params.gateId)];
                        case 1:
                            gate = _a.sent();
                            if (!gate)
                                throw errors_1.ApiError.notFound('That gate is not configured.');
                            health = body.mode === 'automated' ? 'good' : gate.health === 'error' ? 'error' : 'warning';
                            return [4 /*yield*/, gates_repo_1.gatesRepo.setMode(gate.gateId, body.mode, health, body.mode === 'manual' ? new Date() : null)];
                        case 2:
                            updated = _a.sent();
                            return [4 /*yield*/, audit_repo_1.auditRepo.record({
                                    actorUserId: actor.userId,
                                    action: body.mode === 'manual' ? 'gate.manual_mode_on' : 'gate.manual_mode_off',
                                    entityType: 'gate',
                                    entityId: gate.gateId,
                                    detail: "Gate switched to ".concat(body.mode, " mode."),
                                })];
                        case 3:
                            _a.sent();
                            (0, realtime_1.emitRealtime)({ type: 'gate', gate: updated });
                            return [2 /*return*/, updated];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
