const round2 = (n) => Math.round(n * 100) / 100;

export function calculateImpliedProbability(odds) {
  return odds.reduce((sum, odd) => sum + 1 / odd, 0);
}

export function calculateROI(impliedProbability) {
  return round2((1 / impliedProbability - 1) * 100);
}

export function isArbitrage(odds) {
  return calculateImpliedProbability(odds) < 1.0;
}

export function calculateStakes(totalInvestment, odds) {
  const pi = calculateImpliedProbability(odds);
  const stakes = odds.map((odd) => round2((totalInvestment * (1 / odd)) / pi));
  const stakesSum = stakes.reduce((a, b) => a + b, 0);
  if (Math.abs(stakesSum - totalInvestment) > 0.001) {
    stakes[0] = round2(totalInvestment - stakes.slice(1).reduce((a, b) => a + b, 0));
  }
  return stakes;
}

export function calculateWinnings(stakes, odds) {
  return stakes.map((stake, i) => round2(stake * odds[i]));
}

export function calculateProfit(winnings, totalInvestment) {
  return round2(winnings[0] - totalInvestment);
}

export function getBestCombination(bookmakers, investment) {
  const names = Object.keys(bookmakers);
  const outcomes = ['local', 'draw', 'away'];

  const bestOdds = outcomes.map((outcome) => {
    let best = { bookmaker: names[0], odd: bookmakers[names[0]][outcome] };
    for (const name of names) {
      if (bookmakers[name][outcome] > best.odd) {
        best = { bookmaker: name, odd: bookmakers[name][outcome] };
      }
    }
    return best;
  });

  const odds = bestOdds.map((b) => b.odd);
  const pi = calculateImpliedProbability(odds);
  const roi = calculateROI(pi);
  const stakes = calculateStakes(investment, odds);
  const winnings = calculateWinnings(stakes, odds);
  const profit = calculateProfit(winnings, investment);

  return {
    bestOdds,
    impliedProb: pi,
    roi,
    stakes,
    winnings,
    profit,
    isArbitrage: pi < 1.0,
  };
}

export function getAllCombinations(bookmakers, investment) {
  const names = Object.keys(bookmakers);
  const combinations = [];

  for (const i of names) {
    for (const j of names) {
      for (const k of names) {
        const odds = [bookmakers[i].local, bookmakers[j].draw, bookmakers[k].away];
        const pi = calculateImpliedProbability(odds);
        const roi = calculateROI(pi);

        if (roi > 0.5) {
          const stakes = calculateStakes(investment, odds);
          const winnings = calculateWinnings(stakes, odds);
          const profit = calculateProfit(winnings, investment);

          combinations.push({
            bookmakers: [i, j, k],
            odds,
            impliedProb: pi,
            roi,
            stakes,
            winnings,
            profit,
            isArbitrage: pi < 1.0,
          });
        }
      }
    }
  }

  combinations.sort((a, b) => b.roi - a.roi);
  return combinations;
}

export function isValidOdd(odd) {
  const num = parseFloat(odd);
  return !isNaN(num) && num >= 1.01 && num <= 100;
}

export function isValidInvestment(inv) {
  const num = parseFloat(inv);
  return !isNaN(num) && num >= 1 && num <= 100000;
}

export function hasValidData(bookmakers) {
  const keys = Object.keys(bookmakers);
  if (keys.length < 2) return false;
  return keys.every((name) =>
    ['local', 'draw', 'away'].every((o) => isValidOdd(bookmakers[name][o]))
  );
}
