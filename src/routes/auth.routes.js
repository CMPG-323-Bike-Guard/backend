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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = authRoutes;
var zod_1 = require("zod");
var auth_plugin_1 = require("../auth-plugin");
var config_1 = require("../config");
var errors_1 = require("../errors");
var users_repo_1 = require("../repositories/users.repo");
var security_1 = require("../security");
var loginSchema = zod_1.z.object({
    studentStaffNumber: zod_1.z.string().min(1, 'Enter your student/staff number.'),
    password: zod_1.z.string().min(1, 'Enter your password.'),
});
function authRoutes(app) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            app.post('/auth/login', {
                config: {
                    rateLimit: {
                        max: config_1.config.loginRateLimitMax,
                        timeWindow: config_1.config.loginRateLimitWindow,
                        keyGenerator: function (request) {
                            var _a;
                            var number = (_a = request.body) === null || _a === void 0 ? void 0 : _a.studentStaffNumber;
                            return "".concat(request.ip, ":").concat(typeof number === 'string' ? number.trim() : '');
                        },
                        errorResponseBuilder: function (_request, context) { return ({
                            statusCode: 429,
                            code: 'rate_limited',
                            message: "Too many sign-in attempts. Try again in ".concat(context.after, "."),
                        }); },
                    },
                },
            }, function (request) { return __awaiter(_this, void 0, void 0, function () {
                var body, user, _a, _drop, publicUser;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            body = loginSchema.parse(request.body);
                            return [4 /*yield*/, users_repo_1.usersRepo.findByStudentNumberWithPassword(body.studentStaffNumber)];
                        case 1:
                            user = _b.sent();
                            _a = !user;
                            if (_a) return [3 /*break*/, 3];
                            return [4 /*yield*/, (0, security_1.verifyPassword)(body.password, user.passwordHash)];
                        case 2:
                            _a = !(_b.sent());
                            _b.label = 3;
                        case 3:
                            if (_a) {
                                throw new errors_1.ApiError(401, 'invalid_credentials', 'That student/staff number and password do not match.');
                            }
                            if (user.accountStatus !== 'active') {
                                throw new errors_1.ApiError(403, 'account_suspended', 'This account is suspended. Contact the IT service desk.');
                            }
                            _drop = user.passwordHash, publicUser = __rest(user, ["passwordHash"]);
                            return [2 /*return*/, { token: (0, auth_plugin_1.signToken)(publicUser), user: publicUser }];
                    }
                });
            }); });
            app.get('/auth/session', function (request) { return __awaiter(_this, void 0, void 0, function () {
                var authed, user, header;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            authed = request.requireAuth();
                            return [4 /*yield*/, users_repo_1.usersRepo.findById(authed.userId)];
                        case 1:
                            user = _a.sent();
                            if (!user)
                                throw errors_1.ApiError.unauthenticated();
                            header = request.headers.authorization;
                            return [2 /*return*/, { token: header.slice('Bearer '.length), user: user }];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
