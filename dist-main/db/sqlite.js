"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
const node_path_1 = __importDefault(require("node:path"));
const schema_1 = require("./schema");
// better-sqlite3 is CJS
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Database = require('better-sqlite3');
let db = null;
/**
 * Singleton better-sqlite3 instance.
 * DB path: <userData>/storyteller.db
 */
function getDb(opts) {
    if (db)
        return db;
    const dbPath = node_path_1.default.join(opts.userDataPath, 'storyteller.db');
    db = new Database(dbPath);
    (0, schema_1.initSchema)(db);
    return db;
}
