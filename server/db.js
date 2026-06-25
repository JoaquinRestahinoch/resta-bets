import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data.db');

let db;

function run(sql, params = []) { db.run(sql, params); }
function get(sql, params = []) { const stmt = db.prepare(sql); stmt.bind(params); if (stmt.step()) { const cols = stmt.getColumnNames(); const vals = stmt.get(); const row = {}; cols.forEach((c, i) => row[c] = vals[i]); stmt.free(); return row; } stmt.free(); return null; }
function all(sql, params = []) { const rows = []; const stmt = db.prepare(sql); stmt.bind(params); while (stmt.step()) { const cols = stmt.getColumnNames(); const vals = stmt.get(); const row = {}; cols.forEach((c, i) => row[c] = vals[i]); rows.push(row); } stmt.free(); return rows; }
function save() { const data = db.export(); fs.writeFileSync(DB_PATH, Buffer.from(data)); }

export async function initDB() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      eventId TEXT PRIMARY KEY, sport TEXT NOT NULL, league TEXT NOT NULL,
      home TEXT NOT NULL, away TEXT NOT NULL, scheduledTime TEXT,
      status TEXT DEFAULT 'upcoming', createdAt TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS opportunities (
      opportunityId TEXT PRIMARY KEY, eventId TEXT NOT NULL, sport TEXT, league TEXT,
      matchName TEXT, bookmakers TEXT, bestOdds TEXT, impliedProbability REAL,
      roi REAL, stakes TEXT, profit REAL, foundAt TEXT DEFAULT (datetime('now')),
      expiredAt TEXT, status TEXT DEFAULT 'ACTIVE'
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT, opportunityId TEXT, action TEXT,
      timestamp TEXT DEFAULT (datetime('now')), details TEXT
    )
  `);

  save();
  logger.info('db', 'Database initialized');
  return db;
}

export function upsertEvent(event) {
  run(`INSERT INTO events (eventId,sport,league,home,away,scheduledTime,status) VALUES (?,?,?,?,?,?,?)
       ON CONFLICT(eventId) DO UPDATE SET status=excluded.status, scheduledTime=excluded.scheduledTime`,
    [event.eventId, event.sport, event.league, event.home, event.away, event.scheduledTime, event.status || 'upcoming']);
}

export function saveOpportunity(opp) {
  run(`INSERT INTO opportunities (opportunityId,eventId,sport,league,matchName,bookmakers,bestOdds,impliedProbability,roi,stakes,profit,status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(opportunityId) DO UPDATE SET roi=excluded.roi, profit=excluded.profit, status=excluded.status`,
    [opp.opportunityId, opp.eventId, opp.sport, opp.league, opp.matchName,
     JSON.stringify(opp.bookmakers), JSON.stringify(opp.bestOdds),
     opp.impliedProbability, opp.roi, JSON.stringify(opp.stakes), opp.profit, opp.status || 'ACTIVE']);
  run(`INSERT INTO history (opportunityId,action,details) VALUES (?,'FOUND',?)`,
    [opp.opportunityId, JSON.stringify({ roi: opp.roi, profit: opp.profit })]);
  save();
}

export function expireOpportunity(oppId) {
  run(`UPDATE opportunities SET status='EXPIRED', expiredAt=datetime('now') WHERE opportunityId=?`, [oppId]);
  run(`INSERT INTO history (opportunityId,action) VALUES (?,'EXPIRED')`, [oppId]);
  save();
}

export function getActiveOpportunities(filters = {}) {
  let sql = `SELECT * FROM opportunities WHERE status='ACTIVE'`;
  const params = [];
  if (filters.sport) { sql += ` AND sport=?`; params.push(filters.sport); }
  if (filters.minROI) { sql += ` AND roi>=?`; params.push(filters.minROI); }
  sql += ` ORDER BY roi DESC`;
  if (filters.limit) { sql += ` LIMIT ?`; params.push(filters.limit); }
  return all(sql, params).map(r => ({ ...r, bookmakers: JSON.parse(r.bookmakers||'[]'), bestOdds: JSON.parse(r.bestOdds||'[]'), stakes: JSON.parse(r.stakes||'{}') }));
}

export function getStats() {
  const totalEvents = get(`SELECT COUNT(*) as c FROM events`)?.c || 0;
  const activeOpps = get(`SELECT COUNT(*) as c FROM opportunities WHERE status='ACTIVE'`)?.c || 0;
  const todayOpps = get(`SELECT COUNT(*) as c FROM opportunities WHERE foundAt >= date('now')`)?.c || 0;
  const avgROI = get(`SELECT AVG(roi) as a FROM opportunities WHERE status='ACTIVE'`)?.a || 0;
  const maxROI = get(`SELECT MAX(roi) as m FROM opportunities WHERE foundAt >= date('now')`)?.m || 0;
  const totalProfit = get(`SELECT SUM(profit) as s FROM opportunities WHERE foundAt >= date('now')`)?.s || 0;
  return { totalEvents, activeOpportunities: activeOpps, todayFound: todayOpps, avgROI: Math.round(avgROI*100)/100, maxROI: Math.round(maxROI*100)/100, totalPotentialProfit: Math.round(totalProfit*100)/100 };
}

export function getHistory(limit = 100) {
  return all(`SELECT h.*, o.matchName, o.roi, o.sport FROM history h LEFT JOIN opportunities o ON h.opportunityId=o.opportunityId ORDER BY h.timestamp DESC LIMIT ?`, [limit]);
}

export function cleanOldData(days = 30) {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  run(`DELETE FROM history WHERE timestamp < ?`, [cutoff]);
  save();
  logger.info('db', `Cleaned data older than ${days} days`);
}

export function getAllActiveEvents() {
  return all(`SELECT * FROM events WHERE status='upcoming' ORDER BY sport, league, scheduledTime`);
}
