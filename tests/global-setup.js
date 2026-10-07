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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = setup;
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
var pg_1 = require("pg");
var testDatabaseUrl = (_a = process.env.TEST_DATABASE_URL) !== null && _a !== void 0 ? _a : 'postgres://postgres:postgres@localhost:5432/bikeguard_test';
function setup() {
    return __awaiter(this, void 0, void 0, function () {
        var url, dbName, admin, exists, client, dir, _i, _a, file;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    url = new URL(testDatabaseUrl);
                    dbName = url.pathname.slice(1);
                    admin = new pg_1.Client({ connectionString: testDatabaseUrl.replace("/".concat(dbName), '/postgres') });
                    return [4 /*yield*/, admin.connect()];
                case 1:
                    _b.sent();
                    return [4 /*yield*/, admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName])];
                case 2:
                    exists = _b.sent();
                    if (!(exists.rowCount === 0)) return [3 /*break*/, 4];
                    return [4 /*yield*/, admin.query("CREATE DATABASE \"".concat(dbName, "\""))];
                case 3:
                    _b.sent();
                    _b.label = 4;
                case 4: return [4 /*yield*/, admin.end()];
                case 5:
                    _b.sent();
                    client = new pg_1.Client({ connectionString: testDatabaseUrl });
                    return [4 /*yield*/, client.connect()];
                case 6:
                    _b.sent();
                    return [4 /*yield*/, client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')];
                case 7:
                    _b.sent();
                    dir = node_path_1.default.join(process.cwd(), 'migrations');
                    _i = 0, _a = (0, node_fs_1.readdirSync)(dir).filter(function (f) { return f.endsWith('.sql'); }).sort();
                    _b.label = 8;
                case 8:
                    if (!(_i < _a.length)) return [3 /*break*/, 11];
                    file = _a[_i];
                    return [4 /*yield*/, client.query((0, node_fs_1.readFileSync)(node_path_1.default.join(dir, file), 'utf8'))];
                case 9:
                    _b.sent();
                    _b.label = 10;
                case 10:
                    _i++;
                    return [3 /*break*/, 8];
                case 11: return [4 /*yield*/, client.end()];
                case 12:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
