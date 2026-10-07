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
exports.usersRepo = void 0;
var db_1 = require("../db");
function toUser(row) {
    return {
        userId: row.user_id,
        studentStaffNumber: row.student_number,
        name: row.name,
        role: row.role,
        email: row.email,
        photoPath: row.photo_path,
        accountStatus: row.account_status,
    };
}
function toUserWithPassword(row) {
    return __assign(__assign({}, toUser(row)), { passwordHash: row.password_hash });
}
exports.usersRepo = {
    findById: function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var row;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, db_1.queryOne)('SELECT * FROM users WHERE user_id = $1', [userId])];
                    case 1:
                        row = _a.sent();
                        return [2 /*return*/, row ? toUser(row) : null];
                }
            });
        });
    },
    findByIdWithPassword: function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var row;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, db_1.queryOne)('SELECT * FROM users WHERE user_id = $1', [userId])];
                    case 1:
                        row = _a.sent();
                        return [2 /*return*/, row ? toUserWithPassword(row) : null];
                }
            });
        });
    },
    findByStudentNumber: function (studentNumber) {
        return __awaiter(this, void 0, void 0, function () {
            var row;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, db_1.queryOne)('SELECT * FROM users WHERE student_number = $1', [studentNumber.trim()])];
                    case 1:
                        row = _a.sent();
                        return [2 /*return*/, row ? toUser(row) : null];
                }
            });
        });
    },
    findByStudentNumberWithPassword: function (studentNumber) {
        return __awaiter(this, void 0, void 0, function () {
            var row;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, db_1.queryOne)('SELECT * FROM users WHERE student_number = $1', [studentNumber.trim()])];
                    case 1:
                        row = _a.sent();
                        return [2 /*return*/, row ? toUserWithPassword(row) : null];
                }
            });
        });
    },
    list: function (role) {
        return __awaiter(this, void 0, void 0, function () {
            var rows, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!role) return [3 /*break*/, 2];
                        return [4 /*yield*/, (0, db_1.query)('SELECT * FROM users WHERE role = $1 ORDER BY name', [role])];
                    case 1:
                        _a = _b.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, (0, db_1.query)('SELECT * FROM users ORDER BY name')];
                    case 3:
                        _a = _b.sent();
                        _b.label = 4;
                    case 4:
                        rows = _a;
                        return [2 /*return*/, rows.map(toUser)];
                }
            });
        });
    },
    create: function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var row;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, (0, db_1.queryOne)("INSERT INTO users (student_number, name, email, role, password_hash, photo_path)\n       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *", [input.studentNumber, input.name, input.email, input.role, input.passwordHash, (_a = input.photoPath) !== null && _a !== void 0 ? _a : null])];
                    case 1:
                        row = _b.sent();
                        return [2 /*return*/, toUser(row)];
                }
            });
        });
    },
};
