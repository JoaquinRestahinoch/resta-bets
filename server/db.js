import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data.db');

let db;

export function initDB() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      eventId TEXT PRIMARY KEY,
      sport TEXT NOT NULL,
      league TEXT NOT NULL,
      home TEXT NOT NULL,
      away TEXT NOT NULL,
      scheduledTime TEXT,
      status TEXT DEFAULT 'upcoming',
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS odds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eventId TEXT NOT NULL,
      bookmaker TEXT NOT NULL,
      homeOdd REAL NOT NULL,
      drawOdd REAL,
      awayOdd REAL NOT NULL,
      timestamp TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (eventId) REFERENCES events(eventId)
    );

    CREATE TABLE IF NOT EXISTS opportunities (
      opportunityId TEXT PRIMARY KEY,
      eventId TEXT NOT NULL,
      sport TEXT,
      league TEXT,
      matchName TEXT,
      bookmakers TEXT,
      bestOdds TEXT,
      impliedProbability REAL,
      roi REAL,
      stakes TEXT,
      profit REAL,
      foundAt TEXT DEFAULT (datetime('now')),
      expiredAt TEXT,
      status TEXT DEFAULT 'ACTIVE',
      FOREIGN KEY (eventId) REFERENCES events(eventId)
    );

    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opportunityId TEXT,
      action TEXT,
      timestamp TEXT DEFAULT (datetime('now')),
      details TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_odds_event ON odds(eventId, bookmaker);
    CREATE INDEX IF NOT EXISTS idx_opp_status ON opportunities(status);
    CREATE INDEX IF NOT EXISTS idx_opp_roi ON opportunities(roi);
    CREATE INDEX IF NOT EXISTS idx_events_sport ON events(sport, league);
  `);

  logger.info('db', `Database initialized at ${DB_PATH}`);
  return db;
}

export function upsertEvent(event) {
  const stmt = db.prepare(`
    INSERT INTO events (eventId, sport, league, home, away, scheduledTime, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(eventId) DO UPDATE SET
      status = excluded.status,
      scheduledTime = excluded.scheduledTime
  `);
  stmt.run(event.eventId, event.sport, event.league, event.home, event.away, event.scheduledTime, event.status || 'upcoming');
}

export function insertOdds(eventId, bookmaker, odds) {
  const stmt = db.prepare(`
    INSERT INTO odds (eventId, bookmaker, homeOdd, drawOdd, awayOdd)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(eventId, bookmaker, odds.home, odds.draw || null, odds.away);
}

export function saveOpportunity(opp) {
  const stmt = db.prepare(`
    INSERT INTO opportunities (opportunityId, eventId, sport, league, matchName, bookmakers, bestOdds, impliedProbability, roi, stakes, profit, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(opportunityId) DO UPDATE SET
      bestOdds = excluded.bestOdds,
      impliedProbability = excluded.impliedProbability,
      roi = excluded.roi,
      stakes = excluded.stakes,
      profit = excluded.profit,
      status = excluded.status
  `);
  stmt.run(
    opp.opportunityId, opp.eventId, opp.sport, opp.league, opp.matchName,
    JSON.stringify(opp.bookmakers), JSON.stringify(opp.bestOdds),
    opp.impliedProbability, opp.roi, JSON.stringify(opp.stakes),
    opp.profit, opp.status || 'ACTIVE'
  );

  db.prepare(`INSERT INTO history (opportunityId, action, details) VALUES (?, 'FOUND', ?)`)
    .run(opp.opportunityId, JSON.stringify({ roi: opp.roi, profit: opp.profit }));
}

export function expireOpportunity(oppId) {
  db.prepare(`UPDATE opportunities SET status = 'EXPIRED', expiredAt = datetime('now') WHERE opportunityId = ?`).run(oppId);
  db.prepare(`INSERT INTO history (opportunityId, action) VALUES (?, 'EXPIRED')`).run(oppId);
}

export function getActiveOpportunities(filters = {}) {
  let sql = `SELECT * FROM opportunities WHERE status = 'ACTIVE'`;
  const params = [];
  if (filters.sport) { sql += ` AND sport = ?`; params.push(filters.sport); }
  if (filters.minROI) { sql += ` AND roi >= ?`; params.push(filters.minROI); }
  sql += ` ORDER BY roi DESC`;
  if (filters.limit) { sql += ` LIMIT ?`; params.push(filters.limit); }

  return db.prepare(sql).all(...params).map(row => ({
    ...row,
    bookmakers: JSON.parse(row.bookmakers || '[]'),
    bestOdds: JSON.parse(row.bestOdds || '[]'),
    stakes: JSON.parse(row.stakes || '{}'),
  }));
}

export function getStats() {
  const totalEvents = db.prepare(`SELECT COUNT(*) as c FROM events`).get().c;
  const activeOpps = db.prepare(`SELECT COUNT(*) as c FROM opportunities WHERE status = 'ACTIVE'`).get().c;
  const todayOpps = db.prepare(`SELECT COUNT(*) as c FROM opportunities WHERE foundAt >= date('now')`).get().c;
  const avgROI = db.prepare(`SELECT AVG(roi) as a FROM opportunities WHERE status = 'ACTIVE'`).get().a || 0;
  const maxROI = db.prepare(`SELECT MAX(roi) as m FROM opportunities WHERE foundAt >= date('now')`).get().m || 0;
  const totalProfit = db.prepare(`SELECT SUM(profit) as s FROM opportunities WHERE foundAt >= date('now')`).get().s || 0;

  return { totalEvents, activeOpportunities: activeOpps, todayFound: todayOpps, avgROI: Math.round(avgROI * 100) / 100, maxROI: Math.round(maxROI * 100) / 100, totalPotentialProfit: Math.round(totalProfit * 100) / 100 };
}

export function getHistory(limit = 100) {
  return db.prepare(`SELECT h.*, o.matchName, o.roi, o.sport FROM history h LEFT JOIN opportunities o ON h.opportunityId = o.opportunityId ORDER BY h.timestamp DESC LIMIT ?`).all(limit);
}

export function cleanOldData(days = 30) {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  db.prepare(`DELETE FROM odds WHERE timestamp < ?`).run(cutoff);
  db.prepare(`DELETE FROM history WHERE timestamp < ?`).run(cutoff);
  logger.info('db', `Cleaned data older than ${days} days`);
}

export function getAllActiveEvents() {
  return db.prepare(`SELECT * FROM events WHERE status = 'upcoming' ORDER BY sport, league, scheduledTime`).all();
}
