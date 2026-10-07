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
var app_1 = require("../src/app");
var auth_plugin_1 = require("../src/auth-plugin");
var db_1 = require("../src/db");
var users_repo_1 = require("../src/repositories/users.repo");
var helpers_1 = require("./helpers");
var app;
var prefix = '/api/v1';
function tokenFor(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var user;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, users_repo_1.usersRepo.findById(userId)];
                case 1:
                    user = _a.sent();
                    return [2 /*return*/, (0, auth_plugin_1.signToken)(user)];
            }
        });
    });
}
(0, vitest_1.beforeEach)(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, helpers_1.resetDb)()];
            case 1:
                _a.sent();
                return [4 /*yield*/, (0, app_1.buildApp)()];
            case 2:
                app = _a.sent();
                return [4 /*yield*/, app.ready()];
            case 3:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, vitest_1.afterEach)(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, app.close()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, vitest_1.afterAll)(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, db_1.pool.end()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, vitest_1.describe)('POST /users', function () {
    var valid = {
        studentStaffNumber: '31000001',
        name: 'Naledi Khumalo',
        email: 'Naledi@Test.NWU.ac.za',
        role: 'student',
        password: 'Welcome123!',
    };
    var create = function (token, payload) {
        return app.inject({
            method: 'POST',
            url: "".concat(prefix, "/users"),
            headers: token ? { authorization: "Bearer ".concat(token) } : {},
            payload: payload,
        });
    };
    (0, vitest_1.it)('lets an admin add a person, who can then sign in', function () { return __awaiter(void 0, void 0, void 0, function () {
        var adminToken, _a, res, login, audit;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = tokenFor;
                    return [4 /*yield*/, (0, helpers_1.makeUser)('90000001', 'admin')];
                case 1: return [4 /*yield*/, _a.apply(void 0, [_b.sent()])];
                case 2:
                    adminToken = _b.sent();
                    return [4 /*yield*/, create(adminToken, valid)];
                case 3:
                    res = _b.sent();
                    (0, vitest_1.expect)(res.statusCode).toBe(201);
                    (0, vitest_1.expect)(res.json()).toMatchObject({
                        studentStaffNumber: '31000001',
                        name: 'Naledi Khumalo',
                        email: 'naledi@test.nwu.ac.za',
                        role: 'student',
                        accountStatus: 'active',
                    });
                    (0, vitest_1.expect)(res.json()).not.toHaveProperty('passwordHash');
                    return [4 /*yield*/, app.inject({
                            method: 'POST',
                            url: "".concat(prefix, "/auth/login"),
                            payload: { studentStaffNumber: '31000001', password: 'Welcome123!' },
                        })];
                case 4:
                    login = _b.sent();
                    (0, vitest_1.expect)(login.statusCode).toBe(200);
                    return [4 /*yield*/, (0, db_1.query)("SELECT action FROM audit_log WHERE action = 'user.created'")];
                case 5:
                    audit = _b.sent();
                    (0, vitest_1.expect)(audit).toHaveLength(1);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)('can add a guard', function () { return __awaiter(void 0, void 0, void 0, function () {
        var adminToken, _a, res;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = tokenFor;
                    return [4 /*yield*/, (0, helpers_1.makeUser)('90000001', 'admin')];
                case 1: return [4 /*yield*/, _a.apply(void 0, [_b.sent()])];
                case 2:
                    adminToken = _b.sent();
                    return [4 /*yield*/, create(adminToken, __assign(__assign({}, valid), { role: 'guard' }))];
                case 3:
                    res = _b.sent();
                    (0, vitest_1.expect)(res.statusCode).toBe(201);
                    (0, vitest_1.expect)(res.json().role).toBe('guard');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)('refuses guards and students, and unauthenticated requests', function () { return __awaiter(void 0, void 0, void 0, function () {
        var guardToken, _a, studentToken, _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    _a = tokenFor;
                    return [4 /*yield*/, (0, helpers_1.makeUser)('90000002', 'guard')];
                case 1: return [4 /*yield*/, _a.apply(void 0, [_f.sent()])];
                case 2:
                    guardToken = _f.sent();
                    _b = tokenFor;
                    return [4 /*yield*/, (0, helpers_1.makeUser)('30000010')];
                case 3: return [4 /*yield*/, _b.apply(void 0, [_f.sent()])];
                case 4:
                    studentToken = _f.sent();
                    _c = vitest_1.expect;
                    return [4 /*yield*/, create(guardToken, valid)];
                case 5:
                    _c.apply(void 0, [(_f.sent()).statusCode]).toBe(403);
                    _d = vitest_1.expect;
                    return [4 /*yield*/, create(studentToken, valid)];
                case 6:
                    _d.apply(void 0, [(_f.sent()).statusCode]).toBe(403);
                    _e = vitest_1.expect;
                    return [4 /*yield*/, create(null, valid)];
                case 7:
                    _e.apply(void 0, [(_f.sent()).statusCode]).toBe(401);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)('rejects a duplicate student number', function () { return __awaiter(void 0, void 0, void 0, function () {
        var adminToken, _a, res;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = tokenFor;
                    return [4 /*yield*/, (0, helpers_1.makeUser)('90000001', 'admin')];
                case 1: return [4 /*yield*/, _a.apply(void 0, [_b.sent()])];
                case 2:
                    adminToken = _b.sent();
                    return [4 /*yield*/, (0, helpers_1.makeUser)('31000001')];
                case 3:
                    _b.sent();
                    return [4 /*yield*/, create(adminToken, valid)];
                case 4:
                    res = _b.sent();
                    (0, vitest_1.expect)(res.statusCode).toBe(409);
                    (0, vitest_1.expect)(res.json().field).toBe('studentStaffNumber');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)('rejects a duplicate email regardless of case', function () { return __awaiter(void 0, void 0, void 0, function () {
        var adminToken, _a, res, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _a = tokenFor;
                    return [4 /*yield*/, (0, helpers_1.makeUser)('90000001', 'admin')];
                case 1: return [4 /*yield*/, _a.apply(void 0, [_c.sent()])];
                case 2:
                    adminToken = _c.sent();
                    return [4 /*yield*/, create(adminToken, valid)];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, create(adminToken, __assign(__assign({}, valid), { studentStaffNumber: '31000002', email: 'NALEDI@test.nwu.ac.za' }))];
                case 4:
                    res = _c.sent();
                    (0, vitest_1.expect)(res.statusCode).toBe(409);
                    (0, vitest_1.expect)(res.json().field).toBe('email');
                    _b = vitest_1.expect;
                    return [4 /*yield*/, (0, db_1.query)('SELECT 1 FROM users WHERE student_number = $1', ['31000002'])];
                case 5:
                    _b.apply(void 0, [_c.sent()]).toHaveLength(0);
                    return [2 /*return*/];
            }
        });
    }); });
    vitest_1.it.each([
        ['studentStaffNumber', { studentStaffNumber: '123' }],
        ['name', { name: 'N' }],
        ['email', { email: 'not-an-email' }],
        ['role', { role: 'superuser' }],
        ['password', { password: 'short' }],
    ])('rejects an invalid %s', function (field, override) { return __awaiter(void 0, void 0, void 0, function () {
        var adminToken, _a, res;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = tokenFor;
                    return [4 /*yield*/, (0, helpers_1.makeUser)('90000001', 'admin')];
                case 1: return [4 /*yield*/, _a.apply(void 0, [_b.sent()])];
                case 2:
                    adminToken = _b.sent();
                    return [4 /*yield*/, create(adminToken, __assign(__assign({}, valid), override))];
                case 3:
                    res = _b.sent();
                    (0, vitest_1.expect)(res.statusCode).toBe(400);
                    (0, vitest_1.expect)(res.json().field).toBe(field);
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, vitest_1.describe)('POST /auth/login rate limit', function () {
    (0, vitest_1.it)('returns 429 after too many attempts for the same account and still allows other accounts', function () { return __awaiter(void 0, void 0, void 0, function () {
        var attempt, i, _a, blocked, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, helpers_1.makeUser)('30000010')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, (0, helpers_1.makeUser)('30000011')];
                case 2:
                    _c.sent();
                    attempt = function (studentStaffNumber, password) {
                        return app.inject({ method: 'POST', url: "".concat(prefix, "/auth/login"), payload: { studentStaffNumber: studentStaffNumber, password: password } });
                    };
                    i = 0;
                    _c.label = 3;
                case 3:
                    if (!(i < 3)) return [3 /*break*/, 6];
                    _a = vitest_1.expect;
                    return [4 /*yield*/, attempt('30000010', 'wrong')];
                case 4:
                    _a.apply(void 0, [(_c.sent()).statusCode]).toBe(401);
                    _c.label = 5;
                case 5:
                    i += 1;
                    return [3 /*break*/, 3];
                case 6: return [4 /*yield*/, attempt('30000010', 'Password123!')];
                case 7:
                    blocked = _c.sent();
                    (0, vitest_1.expect)(blocked.statusCode).toBe(429);
                    (0, vitest_1.expect)(blocked.json().code).toBe('rate_limited');
                    _b = vitest_1.expect;
                    return [4 /*yield*/, attempt('30000011', 'Password123!')];
                case 8:
                    _b.apply(void 0, [(_c.sent()).statusCode]).toBe(200);
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, vitest_1.describe)('POST /dev/simulate-crossing', function () {
    var post = function (token, payload) {
        return app.inject({
            method: 'POST',
            url: "".concat(prefix, "/dev/simulate-crossing"),
            headers: { authorization: "Bearer ".concat(token) },
            payload: payload,
        });
    };
    (0, vitest_1.it)('matches a student number read from the card against the tag owner', function () { return __awaiter(void 0, void 0, void 0, function () {
        var owner, bike, gateId, token, _a, res;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, helpers_1.makeUser)('30000010')];
                case 1:
                    owner = _b.sent();
                    return [4 /*yield*/, (0, helpers_1.makeBike)(owner)];
                case 2:
                    bike = _b.sent();
                    return [4 /*yield*/, (0, helpers_1.makeTag)(bike, 'T1')];
                case 3:
                    _b.sent();
                    return [4 /*yield*/, (0, helpers_1.makeGate)()];
                case 4:
                    gateId = _b.sent();
                    _a = tokenFor;
                    return [4 /*yield*/, (0, helpers_1.makeUser)('90000002', 'guard')];
                case 5: return [4 /*yield*/, _a.apply(void 0, [_b.sent()])];
                case 6:
                    token = _b.sent();
                    return [4 /*yield*/, post(token, { gateId: gateId, studentNumber: '30000010', tagUid: 'T1' })];
                case 7:
                    res = _b.sent();
                    (0, vitest_1.expect)(res.statusCode).toBe(200);
                    (0, vitest_1.expect)(res.json().gateShouldOpen).toBe(true);
                    (0, vitest_1.expect)(res.json().crossing.event.studentNumber).toBe('30000010');
                    (0, vitest_1.expect)(res.json().crossing.studentStaffNumber).toBe('30000010');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)('does not debounce by default, so repeated taps in the emulator each create an event', function () { return __awaiter(void 0, void 0, void 0, function () {
        var owner, bike, gateId, token, _a, _b, a, b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, (0, helpers_1.makeUser)('30000010')];
                case 1:
                    owner = _d.sent();
                    return [4 /*yield*/, (0, helpers_1.makeBike)(owner)];
                case 2:
                    bike = _d.sent();
                    return [4 /*yield*/, (0, helpers_1.makeTag)(bike, 'T1')];
                case 3:
                    _d.sent();
                    return [4 /*yield*/, (0, helpers_1.makeGate)()];
                case 4:
                    gateId = _d.sent();
                    _a = tokenFor;
                    return [4 /*yield*/, (0, helpers_1.makeUser)('90000002', 'guard')];
                case 5: return [4 /*yield*/, _a.apply(void 0, [_d.sent()])];
                case 6:
                    token = _d.sent();
                    return [4 /*yield*/, post(token, { gateId: gateId, studentNumber: '30000010', tagUid: 'T1' })];
                case 7:
                    _c = [
                        _d.sent()
                    ];
                    return [4 /*yield*/, post(token, { gateId: gateId, studentNumber: '30000010', tagUid: 'T1' })];
                case 8:
                    _b = _c.concat([
                        _d.sent()
                    ]), a = _b[0], b = _b[1];
                    (0, vitest_1.expect)(a.json().crossing.event.eventId).not.toBe(b.json().crossing.event.eventId);
                    return [2 /*return*/];
            }
        });
    }); });
});
