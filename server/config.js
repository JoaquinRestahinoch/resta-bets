try { await import('dotenv/config'); } catch {}

export default {
  port: parseInt(process.env.PORT || '3001'),
  dataMode: process.env.DATA_MODE || 'simulator',
  oddsApiKey: process.env.ODDS_API_KEY || '',
  scrapeInterval: parseInt(process.env.SCRAPE_INTERVAL || '10'),
  minROI: parseFloat(process.env.MIN_ROI || '0.5'),
  notifyROI: parseFloat(process.env.NOTIFY_ROI || '2.0'),

  bookmakers: [
    { id: 'betano', name: 'Betano' },
    { id: 'bet365', name: 'Bet365' },
    { id: 'bplay', name: 'Bplay' },
    { id: 'stake', name: 'Stake' },
    { id: 'betwarrior', name: 'Betwarrior' },
    { id: 'betsson', name: 'Betsson' },
    { id: 'codere', name: 'Codere' },
  ],

  // The Odds API: solo deportes prioritarios para conservar creditos
  // Cada deporte = 1 request = ~12 creditos (con h2h,spreads,totals)
  oddsApiSports: [
    { key: 'soccer_fifa_world_cup', sport: 'soccer', league: 'Mundial 2026' },
    { key: 'soccer_conmebol_copa_libertadores', sport: 'soccer', league: 'Copa Libertadores' },
    { key: 'soccer_brazil_campeonato', sport: 'soccer', league: 'Brasileirao' },
    { key: 'tennis_atp_wimbledon', sport: 'tennis', league: 'Wimbledon ATP' },
  ],
};
