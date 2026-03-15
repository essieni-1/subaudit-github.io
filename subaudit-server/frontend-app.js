// =====================
// CONFIG
// =====================
// Change this to your Railway URL once deployed
const API_URL = "http://localhost:3001";

// =====================
// PHONE MOCKUP
// =====================
const subs = [
  { name: "Adobe CC",  emoji: "🎨", price: "$54.99", usage: "low",    pill: "Rarely used" },
  { name: "Hulu",      emoji: "📺", price: "$17.99", usage: "low",    pill: "Rarely used" },
  { name: "Spotify",   emoji: "🎵", price: "$11.99", usage: "high",   pill: "Used often"  },
  { name: "Dropbox",   emoji: "📦", price: "$9.99",  usage: "medium", pill: "Sometimes"   },
  { name: "Netflix",   emoji: "🎬", price: "$22.99", usage: "medium", pill: "Sometimes"   },
  { name: "LinkedIn",  emoji: "💼", price: "$39.99", usage: "low",    pill: "Rarely used" },
];

const pillClass = { low: "pill-red", medium: "pill-yellow", high: "pill-green" };
const statColor  = { low: "var(--red)", medium: "var(--text)", high: "var(--green)" };

function buildPhoneScreen() {
  const screen = document.getElementById("phone-screen");
  if (!screen) return;

  screen.innerHTML = `
    <div class="ps-header">
      <div class="ps-label">Your subscriptions</div>
      <div class="ps-amount">$171.92<span>/mo</span></div>
    </div>
    <div class="ps-waste">⚠️ You may be wasting <strong>$112.97/mo</strong> on low-usage services</div>
    <div class="ps-grid">
      <div class="ps-stat"><div class="ps-stat-v" style="color:var(--lime)">6</div><div class="ps-stat-l">Active subs</div></div>
      <div class="ps-stat"><div class="ps-stat-v" style="color:var(--red)">3</div><div class="ps-stat-l">Low usage</div></div>
      <div class="ps-stat"><div class="ps-stat-v">$2,063</div><div class="ps-stat-l">Per year</div></div>
    </div>
    ${subs.map(s => `
      <div class="ps-row">
        <span class="ps-emoji">${s.emoji}</span>
        <span class="ps-name">${s.name}</span>
        <span class="ps-pill ${pillClass[s.usage]}">${s.pill}</span>
        <span class="ps-price" style="color:${statColor[s.usage]}">${s.price}</span>
      </div>
    `).join("")}
  `;
}

// =====================
// PLAID BANK CONNECTION
// =====================
let plaidHandler = null;
let itemId = null;

async function initPlaidLink() {
  const btn = document.getElementById("connect-bank-btn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    btn.textContent = "Connecting...";
    btn.disabled = true;

    try {
      // Step 1: Get link token from our backend
      const res = await fetch(`${API_URL}/api/create-link-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (!data.link_token) throw new Error("No link token received");

      // Step 2: Open Plaid Link UI
      plaidHandler = Plaid.create({
        token: data.link_token,
        onSuccess: async (public_token, metadata) => {
          await handlePlaidSuccess(public_token, metadata);
        },
        onExit: (err) => {
          btn.textContent = "Connect your bank free →";
          btn.disabled = false;
          if (err) console.error("Plaid exit error:", err);
        },
        onLoad: () => {},
        onEvent: (eventName) => console.log("Plaid event:", eventName),
      });

      plaidHandler.open();
    } catch (err) {
      console.error("Plaid init error:", err);
      btn.textContent = "Connect your bank free →";
      btn.disabled = false;
      alert("Could not connect to bank. Please try again.");
    }
  });
}

async function handlePlaidSuccess(public_token, metadata) {
  showLoadingOverlay("Scanning your transactions...");

  try {
    // Step 3: Exchange public token
    const exchangeRes = await fetch(`${API_URL}/api/exchange-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_token }),
    });
    const exchangeData = await exchangeRes.json();
    itemId = exchangeData.item_id;

    updateLoadingText("Detecting subscriptions...");

    // Step 4: Get subscriptions
    const subsRes = await fetch(`${API_URL}/api/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: itemId }),
    });
    const subsData = await subsRes.json();

    hideLoadingOverlay();
    showResults(subsData);
  } catch (err) {
    console.error("Bank scan error:", err);
    hideLoadingOverlay();
    alert("Error scanning transactions. Please try again.");
  }
}

// =====================
// RESULTS DISPLAY
// =====================
function showResults(data) {
  const { subscriptions, summary } = data;

  // Scroll to results section
  let resultsSection = document.getElementById("results-section");
  if (!resultsSection) {
    resultsSection = document.createElement("section");
    resultsSection.id = "results-section";
    resultsSection.className = "results-section";
    document.querySelector(".waitlist").insertAdjacentElement("beforebegin", resultsSection);
  }

  const usageLabel = { low: "Rarely used", medium: "Sometimes", high: "Used often" };
  const usagePill = { low: "pill-red", medium: "pill-yellow", high: "pill-green" };

  resultsSection.innerHTML = `
    <div class="section-inner">
      <div class="section-label">Your Audit Results</div>
      <h2 class="section-title">We found <span style="color:var(--lime)">${summary.count} subscriptions</span>.</h2>

      <div class="results-summary">
        <div class="result-stat-card">
          <div class="result-val">$${summary.totalMonthly}</div>
          <div class="result-label">Monthly spend</div>
        </div>
        <div class="result-stat-card">
          <div class="result-val" style="color:var(--red)">$${summary.wasteMonthly}</div>
          <div class="result-label">Potential waste/mo</div>
        </div>
        <div class="result-stat-card">
          <div class="result-val" style="color:var(--lime)">$${summary.wasteAnnual}</div>
          <div class="result-label">You could save/year</div>
        </div>
      </div>

      <div class="results-list">
        ${subscriptions.map(sub => `
          <div class="result-row">
            <div class="result-name">${sub.name}</div>
            <div class="result-meta">
              <span class="result-category">${sub.category}</span>
              <span class="ps-pill ${usagePill[sub.usage]}">${usageLabel[sub.usage]}</span>
            </div>
            <div class="result-amount">
              <div style="font-weight:700">$${sub.amount}/mo</div>
              <div style="color:var(--muted);font-size:12px">$${sub.annualCost}/yr</div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  resultsSection.scrollIntoView({ behavior: "smooth" });
}

// =====================
// LOADING OVERLAY
// =====================
function showLoadingOverlay(text) {
  let overlay = document.getElementById("loading-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "loading-overlay";
    overlay.style.cssText = `
      position:fixed;inset:0;background:#09090Fee;z-index:999;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:'Syne',sans-serif;
    `;
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div style="width:48px;height:48px;border-radius:24px;border:3px solid #1E1E2A;border-top-color:#C8FF00;animation:spin 0.8s linear infinite;margin-bottom:24px"></div>
    <div id="loading-text" style="color:#fff;font-size:18px;font-weight:700">${text}</div>
    <div style="color:#666;font-size:14px;margin-top:8px">Analyzing 90 days of history</div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  `;
  overlay.style.display = "flex";
}

function updateLoadingText(text) {
  const el = document.getElementById("loading-text");
  if (el) el.textContent = text;
}

function hideLoadingOverlay() {
  const overlay = document.getElementById("loading-overlay");
  if (overlay) overlay.style.display = "none";
}

// =====================
// SCROLL ANIMATIONS
// =====================
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
      }
    });
  }, { threshold: 0.12 });

  const targets = document.querySelectorAll(
    ".step, .feature-card, .pricing-card, .section-title, .section-label"
  );
  targets.forEach((el, i) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(28px)";
    el.style.transition = `opacity 0.6s ease ${i * 0.06}s, transform 0.6s ease ${i * 0.06}s`;
    observer.observe(el);
  });
}

// =====================
// WAITLIST FORM
// =====================
function handleSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const email = form.querySelector('input[type="email"]').value;

  fetch(form.action, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ email })
  })
  .then(res => {
    if (res.ok) {
      form.style.display = "none";
      document.getElementById("success-msg").style.display = "block";
    } else {
      alert("Something went wrong. Please try again.");
    }
  })
  .catch(() => alert("Network error. Please try again."));
}

// =====================
// SMOOTH NAV LINKS
// =====================
function initNav() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (e) {
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

// =====================
// INIT
// =====================
document.addEventListener("DOMContentLoaded", () => {
  buildPhoneScreen();
  initScrollAnimations();
  initNav();
  initPlaidLink();
});
