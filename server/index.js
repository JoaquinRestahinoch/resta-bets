import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';
import logger from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { initDB, upsertEvent, saveOpportunity, expireOpportunity, getActiveOpportunities, getStats, getHistory, cleanOldData } from './db.js';
import { scrapeAll, getScraperStatus, initSimulator, setApiKeys, getApiKeys } from './scraper.js';
import { findArbitrage, expireStaleOpportunities, analyzeEvent } from './arbitrage.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

// ─── STATE ───────────────────────────────────────────────────────
let lastScrapeTime = null;
let scrapeCount = 0;
let currentOpportunities = [];
let currentEvents = [];

// ─── SCRAPE CYCLE ────────────────────────────────────────────────
async function runScrapeCycle() {
  try {
    const events = await scrapeAll();
    currentEvents = events;

    for (const ev of events) {
      upsertEvent(ev);
    }

    const opportunities = findArbitrage(events, 100);

    const prevActive = getActiveOpportunities();
    const expiredIds = expireStaleOpportunities(prevActive, opportunities);
    for (const id of expiredIds) {
      expireOpportunity(id);
      io.emit('opportunityExpired', { opportunityId: id });
    }

    const newOpps = [];
    for (const opp of opportunities) {
      const existing = prevActive.find(p => p.opportunityId === opp.opportunityId);
      saveOpportunity(opp);
      if (!existing) {
        newOpps.push(opp);
      }
    }

    currentOpportunities = opportunities;
    lastScrapeTime = new Date().toISOString();
    scrapeCount++;

    io.emit('oddsUpdate', {
      opportunities,
      stats: getStats(),
      scraperStatus: getScraperStatus(),
      lastUpdate: lastScrapeTime,
      eventCount: events.length,
    });

    for (const opp of newOpps) {
      if (opp.roi >= config.notifyROI) {
        io.emit('newOpportunity', opp);
        logger.info('alert', `HIGH ROI opportunity: ${opp.matchName} ROI=${opp.roi}%`);
      }
    }
  } catch (err) {
    logger.error('system', `Scrape cycle failed: ${err.message}`, { stack: err.stack });
    io.emit('scrapingError', { message: err.message, timestamp: new Date().toISOString() });
  }
}

// ─── API ROUTES ──────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    scrapers: getScraperStatus(),
    lastScrape: lastScrapeTime,
    scrapeCount,
    mode: config.dataMode,
  });
});

app.get('/api/apikeys', (req, res) => {
  res.json(getApiKeys());
});

app.post('/api/apikeys', (req, res) => {
  setApiKeys(req.body);
  runScrapeCycle();
  res.json({ success: true, keys: getApiKeys() });
});

app.get('/api/worldcup', (req, res) => {
  const wcEvents = currentEvents.filter(e => e.league?.includes('Mundial'));
  const analyzed = wcEvents.map(ev => {
    const marketAnalyses = analyzeEvent(ev, 100);
    const h2h = marketAnalyses.find(m => m.marketKey === 'h2h');
    const arbCount = marketAnalyses.filter(m => m.roi > 0).length;
    const bestMarket = marketAnalyses[0];
    return {
      eventId: ev.eventId, sport: ev.sport, league: ev.league,
      home: ev.home, away: ev.away,
      scheduledTime: ev.scheduledTime, location: ev.location,
      status: ev.status,
      roi: h2h?.roi ?? bestMarket?.roi ?? null,
      impliedProb: h2h?.impliedProbability ? h2h.impliedProbability * 100 : null,
      bestOdds: h2h?.bestOdds || bestMarket?.bestOdds || null,
      bookmakers: ev.bookmakers,
      bookmakerCount: h2h?.bookmakerCount || 0,
      verdict: (h2h?.roi ?? -99) > 0 ? 'ARBITRAJE' : (h2h?.roi ?? -99) > -2 ? 'MARGINAL' : 'NO APOSTAR',
      marketCount: marketAnalyses.length,
      arbMarketsCount: arbCount,
      markets: marketAnalyses.map(m => ({
        key: m.marketKey, label: m.label, line: m.line,
        roi: m.roi, impliedProb: m.impliedProbability,
        isArbitrage: m.isArbitrage, profit: m.profit,
        bestOdds: m.bestOdds, stakes: m.stakes, winnings: m.winnings,
        bookmakerCount: m.bookmakerCount,
        allOdds: m.allOdds,
      })),
    };
  });
  analyzed.sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
  res.json(analyzed);
});

app.get('/api/opportunities', (req, res) => {
  const { sport, minROI, limit } = req.query;
  res.json(currentOpportunities.filter(o => {
    if (sport && o.sport !== sport) return false;
    if (minROI && o.roi < parseFloat(minROI)) return false;
    return true;
  }).slice(0, parseInt(limit) || 100));
});

app.get('/api/opportunities/:id', (req, res) => {
  const opp = currentOpportunities.find(o => o.opportunityId === req.params.id);
  if (!opp) return res.status(404).json({ error: 'Not found' });
  res.json(opp);
});

app.get('/api/events', (req, res) => {
  let events = currentEvents;
  if (req.query.sport) events = events.filter(e => e.sport === req.query.sport);
  if (req.query.league) events = events.filter(e => e.league === req.query.league);
  res.json(events);
});

app.get('/api/stats', (req, res) => {
  res.json({
    ...getStats(),
    scrapeCount,
    lastUpdate: lastScrapeTime,
    activeBookmakers: getScraperStatus().filter(s => s.status === 'online').length,
    mode: config.dataMode,
    eventCount: currentEvents.length,
  });
});

app.get('/api/bookmakers', (req, res) => {
  res.json(getScraperStatus());
});

app.get('/api/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json(getHistory(limit));
});

app.post('/api/opportunities/:id/execute', (req, res) => {
  const opp = currentOpportunities.find(o => o.opportunityId === req.params.id);
  if (!opp) return res.status(404).json({ error: 'Not found' });
  opp.status = 'EXECUTED';
  saveOpportunity(opp);
  res.json({ success: true, opportunity: opp });
});

// ─── WEBSOCKET ───────────────────────────────────────────────────
io.on('connection', (socket) => {
  logger.info('ws', `Client connected (${io.engine.clientsCount} total)`);

  socket.emit('state', {
    opportunities: currentOpportunities,
    stats: getStats(),
    scraperStatus: getScraperStatus(),
    lastUpdate: lastScrapeTime,
    eventCount: currentEvents.length,
  });

  socket.on('setInvestment', (amount) => {
    if (amount > 0 && amount <= 1000000) {
      const recalculated = findArbitrage(currentEvents, amount);
      socket.emit('oddsUpdate', {
        opportunities: recalculated,
        stats: getStats(),
        scraperStatus: getScraperStatus(),
        lastUpdate: lastScrapeTime,
        eventCount: currentEvents.length,
      });
    }
  });

  socket.on('disconnect', () => {
    logger.info('ws', `Client disconnected (${io.engine.clientsCount} total)`);
  });
});

// ─── SERVE FRONTEND (produccion) ─────────────────────────────────
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io') || req.method !== 'GET') return next();
  res.sendFile(path.join(distPath, 'index.html'));
});

// ─── STARTUP ─────────────────────────────────────────────────────
async function start() {
  try {
    await initDB();
  } catch (err) {
    logger.error('system', `DB init failed: ${err.message}`);
  }

  if (config.dataMode === 'simulator') {
    initSimulator();
  }

  const port = process.env.PORT || config.port || 3001;
  logger.info('system', `Starting server on port ${port}`);

  httpServer.listen(port, '0.0.0.0', () => {
    logger.info('system', `Server running on port ${port}`);

    // Scraping en background - no bloquear el startup
    setTimeout(() => {
      runScrapeCycle().catch(e => logger.error('system', e.message));
    }, 2000);

    const interval = Math.max(config.scrapeInterval, 10);
    const cronExpr = interval >= 60 ? `*/${Math.floor(interval / 60)} * * * *` : `*/${interval} * * * * *`;
    cron.schedule(cronExpr, () => { runScrapeCycle().catch(e => logger.error('system', e.message)); });
    logger.info('system', `Scraping every ${interval} seconds`);

    cron.schedule('0 3 * * *', () => cleanOldData(30));
  });
}

start().catch(err => {
  logger.error('system', `Fatal: ${err.message}`);
  process.exit(1);
});
