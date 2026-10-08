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
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
var db_1 = require("../src/db");
function migrate() {
    return __awaiter(this, void 0, void 0, function () {
        var dir, files, rows, applied, probe, ran, _i, files_1, file;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db_1.pool.query("CREATE TABLE IF NOT EXISTS schema_migrations (\n       filename   TEXT        PRIMARY KEY,\n       applied_at TIMESTAMPTZ NOT NULL DEFAULT now()\n     )")];
                case 1:
                    _a.sent();
                    dir = node_path_1.default.join(process.cwd(), 'migrations');
                    files = (0, node_fs_1.readdirSync)(dir).filter(function (f) { return f.endsWith('.sql'); }).sort();
                    return [4 /*yield*/, db_1.pool.query('SELECT filename FROM schema_migrations')];
                case 2:
                    rows = (_a.sent()).rows;
                    applied = new Set(rows.map(function (row) { return row.filename; }));
                    if (!(applied.size === 0 && files.includes('001_init.sql'))) return [3 /*break*/, 5];
                    return [4 /*yield*/, db_1.pool.query("SELECT to_regclass('public.users') AS present")];
                case 3:
                    probe = (_a.sent()).rows;
                    if (!probe[0].present) return [3 /*break*/, 5];
                    console.log('Existing schema detected , recording 001_init.sql as already applied.');
                    return [4 /*yield*/, db_1.pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', ['001_init.sql'])];
                case 4:
                    _a.sent();
                    applied.add('001_init.sql');
                    _a.label = 5;
                case 5:
                    ran = 0;
                    _i = 0, files_1 = files;
                    _a.label = 6;
                case 6:
                    if (!(_i < files_1.length)) return [3 /*break*/, 10];
                    file = files_1[_i];
                    if (applied.has(file))
                        return [3 /*break*/, 9];
                    console.log("Applying ".concat(file, "..."));
                    return [4 /*yield*/, db_1.pool.query((0, node_fs_1.readFileSync)(node_path_1.default.join(dir, file), 'utf8'))];
                case 7:
                    _a.sent();
                    return [4 /*yield*/, db_1.pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file])];
                case 8:
                    _a.sent();
                    ran += 1;
                    _a.label = 9;
                case 9:
                    _i++;
                    return [3 /*break*/, 6];
                case 10:
                    console.log(ran === 0 ? 'Database is up to date.' : 'Migrations complete.');
                    return [4 /*yield*/, db_1.pool.end()];
                case 11:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
migrate().catch(function (err) {
    console.error(err);
    process.exit(1);
});
