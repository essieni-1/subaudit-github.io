# SubAudit — Stop Leaking Money

A landing page for SubAudit, a subscription auditing app that connects to your bank and finds every recurring charge draining your account.

## 🚀 Live Demo

Open `index.html` in your browser — no build step needed.

## 📁 Project Structure

```
subaudit/
├── index.html          # Main HTML
├── css/
│   └── styles.css      # All styles
├── js/
│   └── app.js          # Interactions & phone mockup
└── README.md
```

## 🛠 Tech Stack

- Pure HTML / CSS / JavaScript — zero dependencies, zero build tools
- Google Fonts (Syne + DM Sans) via CDN
- Fully responsive

## 🖥 Running Locally

Just open `index.html` in any browser:

```bash
# Option 1 - just open the file
open index.html

# Option 2 - use VS Code Live Server extension
# Right-click index.html → "Open with Live Server"

# Option 3 - Python simple server
python3 -m http.server 3000
# then visit http://localhost:3000
```

## 🌐 Deploying to GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Set source to **main branch / root**
4. Visit `https://yourusername.github.io/subaudit`

## 📱 Features Shown

- Hero section with animated phone mockup
- Stats + social proof
- How it works (3-step flow)
- Feature grid with usage scoring demo
- Pricing cards (Free vs Pro)
- Waitlist email capture form

## 🎨 Customization

All colors are CSS variables in `css/styles.css`:

```css
:root {
  --lime: #C8FF00;    /* accent color */
  --bg: #09090F;      /* main background */
  --text: #FFFFFF;    /* body text */
  --muted: #666680;   /* secondary text */
}
```

---

Built with ❤️ using SubAudit.
