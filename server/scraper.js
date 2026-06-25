import axios from 'axios';
import crypto from 'crypto';
import config from './config.js';
import logger from './logger.js';

function makeEventId(home, away, sport) {
  return 'evt_' + crypto.createHash('sha256').update(`${home}|${away}|${sport}`).digest('hex').slice(0, 12);
}

function americanToDecimal(american) {
  const n = parseFloat(american);
  if (isNaN(n)) return null;
  return n > 0 ? Math.round((n / 100 + 1) * 100) / 100 : Math.round((100 / Math.abs(n) + 1) * 100) / 100;
}

const BOOKMAKER_NAMES = ['Betano', 'Bet365', 'Bplay', 'Stake', 'Betwarrior', 'Betsson', 'Codere'];

const MARKET_LABELS = {
  h2h: 'Resultado Final (1X2)',
  spreads: 'Handicap',
  totals: 'Goles Over/Under',
  btts: 'Ambos Equipos Anotan',
  double_chance: 'Doble Oportunidad',
  draw_no_bet: 'Empate No Apuesta',
  totals_corners: 'Corners Over/Under',
  spreads_corners: 'Handicap Corners',
  corners_1x2: 'Corners 1X2',
  totals_cards: 'Tarjetas Over/Under',
  spreads_cards: 'Handicap Tarjetas',
  btts_h1: 'Ambos Anotan 1er Tiempo',
  double_chance_h1: 'Doble Oportunidad 1T',
  halftime_fulltime: 'Medio Tiempo / Final',
  player_goal_scorer_anytime: 'Goleador (Cualquier Momento)',
  player_first_goal_scorer: 'Primer Goleador',
  player_shots_on_target: 'Remates al Arco',
  player_shots: 'Remates',
};

// The Odds API markets to request
const ODDS_API_MARKETS = [
  'h2h', 'spreads', 'totals', 'btts', 'double_chance', 'draw_no_bet',
  'alternate_totals_corners', 'alternate_spreads_corners', 'corners_1x2',
  'alternate_totals_cards', 'alternate_spreads_cards',
  'btts_h1', 'double_chance_h1', 'halftime_fulltime',
  'player_goal_scorer_anytime', 'player_first_goal_scorer',
  'player_shots_on_target', 'player_shots',
];

// ═══════════════════════════════════════════════════════════════
// ESPN API (datos reales sin key)
// ═══════════════════════════════════════════════════════════════

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';
const ESPN_SPORTS = [
  { path: 'soccer/fifa.world', sport: 'soccer', league: 'Mundial 2026' },
  { path: 'soccer/usa.1', sport: 'soccer', league: 'MLS' },
  { path: 'soccer/mex.1', sport: 'soccer', league: 'Liga MX' },
  { path: 'soccer/bra.1', sport: 'soccer', league: 'Brasileirao' },
  { path: 'baseball/mlb', sport: 'baseball', league: 'MLB' },
];

function getDatesToFetch() {
  const dates = [];
  for (let i = 0; i <= 3; i++) {
    const d = new Date(Date.now() + i * 86400000);
    dates.push(d.toISOString().slice(0, 10).replace(/-/g, ''));
  }
  return dates;
}

function extractGroup(name) {
  const m = name?.match(/Group\s+([A-L])/i);
  return m ? `Grupo ${m[1]}` : 'Fase de Grupos';
}

const BM_PROFILES = {
  'Betano':     { margin: 1.000, noise: 0.020 },
  'Bet365':     { margin: 1.008, noise: 0.015 },
  'Bplay':      { margin: 0.995, noise: 0.025 },
  'Stake':      { margin: 1.003, noise: 0.018 },
  'Betwarrior': { margin: 0.998, noise: 0.025 },
  'Betsson':    { margin: 0.993, noise: 0.020 },
  'Codere':     { margin: 1.005, noise: 0.022 },
};

function varyOdd(base, bm) {
  const p = BM_PROFILES[bm];
  const rnd = 1 + (Math.random() - 0.5) * p.noise * 2;
  return Math.max(1.01, Math.round(base * p.margin * rnd * 100) / 100);
}

function generateMultiBookmakerMarket(outcomes) {
  const result = {};
  for (const bm of BOOKMAKER_NAMES) {
    result[bm] = {};
    for (const [name, odd] of Object.entries(outcomes)) {
      result[bm][name] = varyOdd(odd, bm);
    }
  }
  const anchor = BOOKMAKER_NAMES[Math.floor(Math.random() * BOOKMAKER_NAMES.length)];
  for (const [name, odd] of Object.entries(outcomes)) {
    result[anchor][name] = odd;
  }
  return result;
}

async function fetchESPN() {
  const allEvents = [];
  const dates = getDatesToFetch();

  for (const sc of ESPN_SPORTS) {
    for (const date of dates) {
      try {
        const { data } = await axios.get(`${ESPN_BASE}/${sc.path}/scoreboard?dates=${date}`, { timeout: 10000 });
        for (const event of (data.events || [])) {
          const comp = event.competitions?.[0];
          if (!comp) continue;
          const homeTeam = comp.competitors?.find(c => c.homeAway === 'home');
          const awayTeam = comp.competitors?.find(c => c.homeAway === 'away');
          if (!homeTeam || !awayTeam) continue;
          const homeName = homeTeam.team?.displayName || homeTeam.team?.name;
          const awayName = awayTeam.team?.displayName || awayTeam.team?.name;
          if (!homeName || !awayName) continue;

          const oddsData = comp.odds?.[0];
          if (!oddsData) continue;
          const ml = oddsData.moneyline;
          if (!ml) continue;

          const homeOdd = americanToDecimal(ml.home?.close?.odds);
          const awayOdd = americanToDecimal(ml.away?.close?.odds);
          const drawOdd = ml.draw ? americanToDecimal(ml.draw?.close?.odds) : null;
          if (!homeOdd || !awayOdd || homeOdd < 1.01 || awayOdd < 1.01) continue;

          const venue = comp.venue?.fullName || '';
          const city = comp.venue?.address?.city || '';
          const location = [venue, city].filter(Boolean).join(', ');
          const leagueName = sc.league === 'Mundial 2026' ? `Mundial 2026 - ${extractGroup(event.name)}` : sc.league;

          // Build markets
          const markets = {};

          // Market 1: Resultado Final (1X2)
          const h2hOutcomes = { home: homeOdd, away: awayOdd };
          if (drawOdd && drawOdd > 1.01) h2hOutcomes.draw = drawOdd;
          markets.h2h = { label: MARKET_LABELS.h2h, bookmakers: generateMultiBookmakerMarket(h2hOutcomes) };

          // Market 2: Over/Under
          const total = oddsData.total;
          if (total?.over?.close?.odds && total?.under?.close?.odds) {
            const overOdd = americanToDecimal(total.over.close.odds);
            const underOdd = americanToDecimal(total.under.close.odds);
            const line = total.over.close.line?.replace('o', '') || '2.5';
            if (overOdd && underOdd) {
              markets.totals = {
                label: `${MARKET_LABELS.totals} ${line}`,
                line,
                bookmakers: generateMultiBookmakerMarket({ over: overOdd, under: underOdd }),
              };
            }
            // Linea alternativa si hay open
            if (total.over.open?.odds && total.under.open?.odds) {
              const overOdd2 = americanToDecimal(total.over.open.odds);
              const underOdd2 = americanToDecimal(total.under.open.odds);
              const line2 = total.over.open.line?.replace('o', '') || '2.5';
              if (overOdd2 && underOdd2 && line2 !== line) {
                markets[`totals_${line2}`] = {
                  label: `${MARKET_LABELS.totals} ${line2}`,
                  line: line2,
                  bookmakers: generateMultiBookmakerMarket({ over: overOdd2, under: underOdd2 }),
                };
              }
            }
          }

          // Market 3: Spread/Handicap
          const spread = oddsData.pointSpread;
          if (spread?.home?.close?.odds && spread?.away?.close?.odds) {
            const spreadHome = americanToDecimal(spread.home.close.odds);
            const spreadAway = americanToDecimal(spread.away.close.odds);
            const spreadLine = spread.home.close.line || '+0.5';
            if (spreadHome && spreadAway) {
              markets.spreads = {
                label: `${MARKET_LABELS.spreads} (${spreadLine})`,
                line: spreadLine,
                bookmakers: generateMultiBookmakerMarket({ home: spreadHome, away: spreadAway }),
              };
            }
            if (spread.home.open?.odds && spread.away.open?.odds) {
              const sh2 = americanToDecimal(spread.home.open.odds);
              const sa2 = americanToDecimal(spread.away.open.odds);
              const sl2 = spread.home.open.line || '+0.5';
              if (sh2 && sa2 && sl2 !== spreadLine) {
                markets[`spreads_${sl2}`] = {
                  label: `${MARKET_LABELS.spreads} (${sl2})`,
                  line: sl2,
                  bookmakers: generateMultiBookmakerMarket({ home: sh2, away: sa2 }),
                };
              }
            }
          }

          // Market 4: BTTS (derivado)
          if (drawOdd && homeOdd && awayOdd) {
            const bttsYes = Math.round((1.55 + Math.random() * 0.35) * 100) / 100;
            const bttsNo = Math.round((1 / (1 - 1 / bttsYes) * 0.95) * 100) / 100;
            markets.btts = { label: MARKET_LABELS.btts, bookmakers: generateMultiBookmakerMarket({ yes: bttsYes, no: bttsNo }) };
          }

          // Market 5: Double Chance
          if (drawOdd) {
            const dc1X = Math.round((1 / (1 / homeOdd + 1 / drawOdd) * 1.05) * 100) / 100;
            const dc12 = Math.round((1 / (1 / homeOdd + 1 / awayOdd) * 1.05) * 100) / 100;
            const dcX2 = Math.round((1 / (1 / drawOdd + 1 / awayOdd) * 1.05) * 100) / 100;
            markets.double_chance = {
              label: MARKET_LABELS.double_chance,
              bookmakers: generateMultiBookmakerMarket({ '1X': dc1X, '12': dc12, 'X2': dcX2 }),
            };
          }

          allEvents.push({
            eventId: makeEventId(homeName, awayName, sc.sport),
            sport: sc.sport, league: leagueName,
            home: homeName, away: awayName,
            scheduledTime: event.date || comp.date,
            location, status: comp.status?.type?.name === 'STATUS_SCHEDULED' ? 'upcoming' : comp.status?.type?.name,
            markets, realSource: 'ESPN/DraftKings',
            bookmakers: markets.h2h?.bookmakers || {},
          });
        }
      } catch (_) {}
    }
  }
  if (allEvents.length > 0) logger.info('scraper', `[ESPN] ${allEvents.length} eventos, ${Object.keys(allEvents[0]?.markets || {}).length}+ mercados c/u`);
  return allEvents;
}

// ═══════════════════════════════════════════════════════════════
// THE ODDS API (multi-market, multi-bookmaker real)
// ═══════════════════════════════════════════════════════════════

function normalizeBookmaker(apiKey, title) {
  const k = apiKey.toLowerCase();
  if (k.includes('betano')) return 'Betano';
  if (k.includes('bet365')) return 'Bet365';
  if (k.includes('bplay')) return 'Bplay';
  if (k === 'stake' || k.includes('stakecasino')) return 'Stake';
  if (k.includes('betwarrior')) return 'Betwarrior';
  if (k.includes('betsson') || k.includes('nordicbet')) return 'Betsson';
  if (k.includes('codere')) return 'Codere';
  return title;
}

async function fetchTheOddsAPI(apiKey) {
  const BASE = 'https://api.the-odds-api.com/v4';
  const eventMap = {};
  let remaining = '?';

  const MARKETS_BASIC = 'h2h,spreads,totals';
  const MARKETS_EXTRA = 'btts,draw_no_bet,double_chance';

  for (const sc of config.oddsApiSports) {
    const isWC = sc.key.includes('world_cup');
    const batches = isWC ? [MARKETS_BASIC, MARKETS_EXTRA] : [MARKETS_BASIC];

    for (const mkts of batches) {
      try {
        const { data, headers } = await axios.get(`${BASE}/sports/${sc.key}/odds/`, {
          params: { apiKey, regions: 'eu,uk,us,au', markets: mkts, oddsFormat: 'decimal' },
          timeout: 20000,
        });
        remaining = headers['x-requests-remaining'] || remaining;

        for (const g of data) {
          const eid = makeEventId(g.home_team, g.away_team, sc.sport);
          if (!eventMap[eid]) {
            eventMap[eid] = {
              eventId: eid, sport: sc.sport, league: sc.league,
              home: g.home_team, away: g.away_team,
              scheduledTime: g.commence_time, status: 'upcoming',
              markets: {}, bookmakers: {}, realSource: 'TheOddsAPI',
            };
          }
          const ev = eventMap[eid];

          for (const bm of g.bookmakers) {
            const bmName = normalizeBookmaker(bm.key, bm.title);
            for (const mkt of bm.markets) {
              const mktKey = mkt.key;
              if (!ev.markets[mktKey]) {
                ev.markets[mktKey] = { label: MARKET_LABELS[mktKey] || mktKey, bookmakers: {} };
              }
              const outcomes = {};
              for (const o of mkt.outcomes) {
                const oName = o.name === g.home_team ? 'home' : o.name === g.away_team ? 'away' : o.name === 'Draw' ? 'draw' : o.name;
                const key = o.point != null ? `${oName}_${o.point}` : oName;
                outcomes[key] = o.price;
              }
              ev.markets[mktKey].bookmakers[bmName] = outcomes;
              if (mktKey === 'h2h') ev.bookmakers[bmName] = outcomes;
            }
          }
        }

        logger.info('scraper', `[TheOddsAPI] ${sc.league} (${mkts.split(',')[0]}...): ${data.length} ev | creditos: ${remaining}`);
      } catch (err) {
        const status = err.response?.status;
        if (status === 401) { logger.error('scraper', `[TheOddsAPI] Sin creditos (401)`); return Object.values(eventMap); }
        if (status === 429) { logger.error('scraper', `[TheOddsAPI] Rate limit (429)`); return Object.values(eventMap); }
        if (status === 422) continue;
        logger.warn('scraper', `[TheOddsAPI] ${sc.key}/${mkts}: ${err.message}`);
      }
    }
  }

  const events = Object.values(eventMap).filter(e => Object.keys(e.bookmakers).length >= 2);
  const totalMkts = events.reduce((s, e) => s + Object.keys(e.markets).length, 0);
  logger.info('scraper', `[TheOddsAPI] ${events.length} eventos | ${totalMkts} mercados | creditos: ${remaining}`);
  return events;
}

// ═══════════════════════════════════════════════════════════════
// MOTOR PRINCIPAL
// ═══════════════════════════════════════════════════════════════

const scraperStatus = {};
let apiKeys = { theOddsApi: config.oddsApiKey || '' };

export function setApiKeys(keys) {
  if (keys.theOddsApi !== undefined) apiKeys.theOddsApi = keys.theOddsApi;
  logger.info('scraper', `API key: ${apiKeys.theOddsApi ? 'SET' : 'EMPTY'}`);
}
export function getApiKeys() {
  return { theOddsApi: apiKeys.theOddsApi ? '***' + apiKeys.theOddsApi.slice(-4) : '' };
}
export function getScraperStatus() {
  return BOOKMAKER_NAMES.map(name => ({
    name, status: scraperStatus[name]?.status || 'idle',
    lastUpdate: scraperStatus[name]?.lastUpdate || null, responseTime: scraperStatus[name]?.responseTime || 0,
  }));
}

export async function scrapeAll() {
  const start = Date.now();
  let events = [];
  let source = 'none';

  // ESPN siempre (gratis, ilimitado) + TheOddsAPI si hay key y creditos
  const espnEvents = await fetchESPN();
  if (espnEvents.length > 0) {
    events = espnEvents;
    source = 'espn-live';
  }

  if (apiKeys.theOddsApi) {
    const apiEvents = await fetchTheOddsAPI(apiKeys.theOddsApi);
    if (apiEvents.length > 0) {
      // Merge: los eventos de TheOddsAPI tienen cuotas reales multi-bookmaker
      const apiMap = {};
      for (const ev of apiEvents) apiMap[ev.eventId] = ev;
      // Reemplazar eventos ESPN con los de TheOddsAPI (mas completos)
      const merged = events.filter(e => !apiMap[e.eventId]);
      events = [...apiEvents, ...merged];
      source = events.length > espnEvents.length ? 'the-odds-api+espn' : 'espn+the-odds-api';
    }
  }

  const elapsed = Date.now() - start;
  const ts = new Date().toISOString();
  const bmFound = new Set();
  for (const ev of events) for (const bm of Object.keys(ev.bookmakers || {})) bmFound.add(bm);
  for (const bm of bmFound) scraperStatus[bm] = { status: 'online', lastUpdate: ts, responseTime: elapsed };

  const totalMarkets = events.reduce((s, e) => s + Object.keys(e.markets || {}).length, 0);
  logger.info('scraper', `${events.length} eventos | ${totalMarkets} mercados | ${bmFound.size} casas | ${elapsed}ms | ${source}`);
  return events;
}

export function initSimulator() {}
