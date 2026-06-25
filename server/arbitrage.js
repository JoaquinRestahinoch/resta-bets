import crypto from 'crypto';
import logger from './logger.js';
import config from './config.js';

const round2 = (n) => Math.round(n * 100) / 100;

function analyzeMarket(marketKey, marketData, investment = 100) {
  const bmEntries = Object.entries(marketData.bookmakers || {});
  if (bmEntries.length < 2) return null;

  // Contar cuantas casas tienen cada outcome para filtrar inconsistencias
  const outcomeCounts = {};
  for (const [, odds] of bmEntries) {
    for (const name of Object.keys(odds)) {
      outcomeCounts[name] = (outcomeCounts[name] || 0) + 1;
    }
  }
  // Solo usar outcomes que al menos 2 casas tienen
  const outcomeNames = new Set(
    Object.entries(outcomeCounts).filter(([, c]) => c >= 2).map(([n]) => n)
  );
  if (outcomeNames.size < 2 || outcomeNames.size > 5) return null;

  const bestOdds = {};
  for (const outcome of outcomeNames) {
    let best = { bookmaker: null, odd: 0 };
    for (const [bm, odds] of bmEntries) {
      if (odds[outcome] != null && odds[outcome] > best.odd) {
        best = { bookmaker: bm, odd: odds[outcome] };
      }
    }
    if (best.bookmaker && best.odd > 1) bestOdds[outcome] = best;
  }

  if (Object.keys(bestOdds).length < 2) return null;

  const pi = Object.values(bestOdds).reduce((s, b) => s + 1 / b.odd, 0);
  const roi = round2((1 / pi - 1) * 100);

  const stakes = {};
  let stakeSum = 0;
  const outcomes = Object.keys(bestOdds);
  for (const o of outcomes) {
    stakes[o] = round2((investment * (1 / bestOdds[o].odd)) / pi);
    stakeSum += stakes[o];
  }
  const diff = round2(investment - stakeSum);
  if (Math.abs(diff) > 0.001) stakes[outcomes[0]] = round2(stakes[outcomes[0]] + diff);

  const winnings = {};
  for (const o of outcomes) {
    winnings[o] = round2(stakes[o] * bestOdds[o].odd);
  }
  const profit = round2(Object.values(winnings)[0] - investment);

  return {
    marketKey,
    label: marketData.label || marketKey,
    line: marketData.line || null,
    impliedProbability: round2(pi * 10000) / 10000,
    roi,
    bestOdds: Object.entries(bestOdds).map(([outcome, data]) => ({
      outcome, bookmaker: data.bookmaker, odd: data.odd,
    })),
    stakes,
    winnings,
    profit,
    investment,
    isArbitrage: roi > 0 && roi < 50,
    bookmakerCount: bmEntries.length,
    allOdds: marketData.bookmakers,
  };
}

export function analyzeEvent(event, investment = 100) {
  const results = [];
  for (const [key, mkt] of Object.entries(event.markets || {})) {
    const analysis = analyzeMarket(key, mkt, investment);
    if (analysis) results.push(analysis);
  }
  results.sort((a, b) => b.roi - a.roi);
  return results;
}

export function findArbitrage(events, investment = 100) {
  const opportunities = [];

  for (const event of events) {
    const marketAnalyses = analyzeEvent(event, investment);
    const arbMarkets = marketAnalyses.filter(m => m.roi >= config.minROI && m.roi < 50);

    for (const mkt of arbMarkets) {
      const oppId = 'opp_' + crypto.createHash('sha256')
        .update(`${event.eventId}|${mkt.marketKey}|${mkt.bestOdds.map(b => b.bookmaker + b.odd).join('|')}`)
        .digest('hex').slice(0, 12);

      opportunities.push({
        opportunityId: oppId,
        eventId: event.eventId,
        sport: event.sport,
        league: event.league,
        matchName: `${event.home} vs ${event.away}`,
        home: event.home,
        away: event.away,
        scheduledTime: event.scheduledTime,
        location: event.location || null,
        marketKey: mkt.marketKey,
        marketLabel: mkt.label,
        marketLine: mkt.line,
        bestOdds: mkt.bestOdds,
        allBookmakerOdds: mkt.allOdds,
        impliedProbability: mkt.impliedProbability,
        roi: mkt.roi,
        stakes: mkt.stakes,
        winnings: mkt.winnings,
        profit: mkt.profit,
        investment: mkt.investment,
        status: 'ACTIVE',
        foundAt: new Date().toISOString(),
        profitability: mkt.roi > 3 ? 'HIGH' : mkt.roi > 1.5 ? 'MEDIUM' : 'LOW',
        bookmakerCount: mkt.bookmakerCount,
      });
    }
  }

  opportunities.sort((a, b) => b.roi - a.roi);
  logger.info('arbitrage', `${opportunities.length} oportunidades en ${events.length} eventos (multi-mercado)`);
  return opportunities;
}

export function expireStaleOpportunities(activeOpps, newOpps) {
  const newIds = new Set(newOpps.map(o => `${o.eventId}_${o.marketKey}`));
  return activeOpps
    .filter(o => !newIds.has(`${o.eventId}_${o.marketKey}`))
    .map(o => o.opportunityId);
}
