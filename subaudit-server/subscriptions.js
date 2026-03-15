// =====================
// SUBSCRIPTION DETECTOR
// =====================
// Analyzes transactions and identifies recurring subscriptions

const KNOWN_SUBSCRIPTIONS = [
  "netflix", "spotify", "hulu", "disney", "apple", "amazon prime",
  "youtube", "adobe", "dropbox", "linkedin", "notion", "figma",
  "slack", "zoom", "canva", "grammarly", "duolingo", "calm",
  "headspace", "audible", "kindle", "icloud", "google one",
  "microsoft 365", "office 365", "paramount", "peacock", "hbo",
  "max", "crunchyroll", "twitch", "patreon", "substack"
];

// Score usage based on how often they appear vs expected monthly
function scoreUsage(occurrences, dayRange) {
  const monthsInRange = dayRange / 30;
  const expectedMonthly = monthsInRange;
  const ratio = occurrences / expectedMonthly;

  if (ratio >= 0.9) return "high";
  if (ratio >= 0.5) return "medium";
  return "low";
}

// Group transactions by merchant and find recurring ones
function detectSubscriptions(transactions) {
  const merchantMap = {};

  for (const tx of transactions) {
    const name = (tx.merchant_name || tx.name || "").toLowerCase().trim();
    const amount = Math.abs(tx.amount);
    const date = tx.date;

    if (amount <= 0) continue; // skip credits/refunds

    // Check if it's a known subscription service
    const isKnown = KNOWN_SUBSCRIPTIONS.some(sub => name.includes(sub));

    const key = tx.merchant_name || tx.name;

    if (!merchantMap[key]) {
      merchantMap[key] = {
        name: tx.merchant_name || tx.name,
        amounts: [],
        dates: [],
        category: tx.category?.[0] || "Other",
        isKnown,
      };
    }

    merchantMap[key].amounts.push(amount);
    merchantMap[key].dates.push(date);
  }

  const subscriptions = [];
  const now = new Date();

  for (const [, data] of Object.entries(merchantMap)) {
    const { name, amounts, dates, category, isKnown } = data;

    // Need at least 2 charges to be considered recurring
    if (amounts.length < 2 && !isKnown) continue;

    // Check if amounts are consistent (within 5% variance)
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const isConsistent = amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.05);

    if (!isConsistent && !isKnown) continue;

    // Sort dates and find oldest
    const sortedDates = dates.sort();
    const oldest = new Date(sortedDates[0]);
    const dayRange = Math.round((now - oldest) / (1000 * 60 * 60 * 24));

    const usage = scoreUsage(amounts.length, Math.max(dayRange, 30));

    // Get last charged date
    const lastCharged = dates[dates.length - 1];

    subscriptions.push({
      name,
      amount: parseFloat(avgAmount.toFixed(2)),
      annualCost: parseFloat((avgAmount * 12).toFixed(2)),
      category,
      billing: "Monthly",
      lastCharged,
      occurrences: amounts.length,
      usage,
      isKnown,
    });
  }

  // Sort: low usage first (biggest savings opportunity)
  subscriptions.sort((a, b) => {
    const order = { low: 0, medium: 1, high: 2 };
    return order[a.usage] - order[b.usage];
  });

  return subscriptions;
}

function calculateSummary(subscriptions) {
  const totalMonthly = subscriptions.reduce((sum, s) => sum + s.amount, 0);
  const wasteMonthly = subscriptions
    .filter(s => s.usage === "low")
    .reduce((sum, s) => sum + s.amount, 0);

  return {
    totalMonthly: parseFloat(totalMonthly.toFixed(2)),
    totalAnnual: parseFloat((totalMonthly * 12).toFixed(2)),
    wasteMonthly: parseFloat(wasteMonthly.toFixed(2)),
    wasteAnnual: parseFloat((wasteMonthly * 12).toFixed(2)),
    count: subscriptions.length,
    lowUsageCount: subscriptions.filter(s => s.usage === "low").length,
  };
}

module.exports = { detectSubscriptions, calculateSummary };
