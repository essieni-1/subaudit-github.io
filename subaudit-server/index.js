require("dotenv").config();
const express = require("express");
const cors = require("cors");
const {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
} = require("plaid");
const { detectSubscriptions, calculateSummary } = require("./subscriptions");

const app = express();
app.use(express.json());
app.use(cors({
  origin: [
    "http://localhost:5500",         // VSCode Live Server
    "http://127.0.0.1:5500",
    "http://localhost:3000",
    "https://essieni-1.github.io",   // Your GitHub Pages site
  ],
  credentials: true,
}));

// =====================
// PLAID CLIENT SETUP
// =====================
const plaidConfig = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || "sandbox"],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
    },
  },
});
const plaidClient = new PlaidApi(plaidConfig);

// In-memory token store (use a database in production)
const tokenStore = {};

// =====================
// ROUTES
// =====================

// Health check
app.get("/", (req, res) => {
  res.json({ status: "SubAudit server running ✅", env: process.env.PLAID_ENV });
});

// Step 1: Create a link token (starts the Plaid Link flow)
app.post("/api/create-link-token", async (req, res) => {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: "subaudit-user-" + Date.now() },
      client_name: "SubAudit",
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: "en",
    });

    res.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error("create-link-token error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to create link token" });
  }
});

// Step 2: Exchange public token for access token
app.post("/api/exchange-token", async (req, res) => {
  const { public_token } = req.body;

  if (!public_token) {
    return res.status(400).json({ error: "public_token is required" });
  }

  try {
    const response = await plaidClient.itemPublicTokenExchange({ public_token });
    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    // Store token (use a real DB in production)
    tokenStore[itemId] = accessToken;

    res.json({ item_id: itemId, success: true });
  } catch (err) {
    console.error("exchange-token error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to exchange token" });
  }
});

// Step 3: Fetch transactions and detect subscriptions
app.post("/api/subscriptions", async (req, res) => {
  const { item_id } = req.body;

  if (!item_id || !tokenStore[item_id]) {
    return res.status(400).json({ error: "Invalid or missing item_id" });
  }

  const accessToken = tokenStore[item_id];

  try {
    // Get 90 days of transactions
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString().split("T")[0];

    let allTransactions = [];
    let hasMore = true;
    let cursor = undefined;

    // Paginate through all transactions
    while (hasMore) {
      const response = await plaidClient.transactionsSync({
        access_token: accessToken,
        cursor,
      });

      const data = response.data;
      allTransactions = allTransactions.concat(data.added);
      hasMore = data.has_more;
      cursor = data.next_cursor;

      if (!data.has_more) break;
    }

    // Filter to date range
    const filtered = allTransactions.filter(tx => {
      return tx.date >= startDate && tx.date <= endDate;
    });

    const subscriptions = detectSubscriptions(filtered);
    const summary = calculateSummary(subscriptions);

    res.json({ subscriptions, summary });
  } catch (err) {
    console.error("subscriptions error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════╗
  ║   SubAudit Server Running      ║
  ║   http://localhost:${PORT}        ║
  ║   Environment: ${process.env.PLAID_ENV}         ║
  ╚════════════════════════════════╝
  `);
});
