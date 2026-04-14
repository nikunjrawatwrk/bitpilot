# ✈️ BitPilot — Bitbucket PR Reviewer

> *"Har PR review karna boring tha. Ab nahi."*

---

## 😤 Problem — Yeh Banaya Kyun?

Agar aap ek developer hain jo Bitbucket use karta hai, toh yeh scene familiar lagega:

- Bitbucket ka UI **slow aur clunky** hai — har baar browser mein 4-5 tabs khulte hain sirf ek PR dekhne ke liye
- Code review karna **time-consuming** hai — diff padhna, mentally samajhna, comment likhna... sab manually
- PR merge karo toh **staging deploy** hoti hai — lekin pata nahi kab hogi, team ko manually batao
- Har PR pe **same cheezein miss hoti hain** — missing error handling, security holes, performance issues — kyunki reviewer bhi insaan hai, thak jaata hai

**Saaf baat:** Bitbucket ka built-in experience 2024 ke liye kaafi nahi hai. Hum ek aisa tool chahte the jo **AI ki power** use kare aur PR review ko genuinely fast aur smart banaye.

---

## ✅ Solution — BitPilot Kya Karta Hai?

BitPilot ek **self-hosted web dashboard** hai jo aapke project ke andar baith ke kaam karta hai. Koi cloud nahi, koi subscription nahi — sirf aapka machine, aapka code.

### Jo problems solve hoti hain:

| Problem | BitPilot Ka Solution |
|---------|-------------------|
| Bitbucket UI slow hai | Fast, clean dashboard — saare PRs ek jagah |
| Manual code review thaka deta hai | AI automatically bugs, security issues, performance problems dhundta hai |
| PR context nahi hota reviewer ko | Codebase indexing — AI aapka poora project samajhta hai pehle, phir review karta hai |
| Staging deploy ka pata nahi chalta | Auto 16-minute countdown + Zoho Cliq / Slack notification |
| Approve, merge ke liye Bitbucket kholna padta hai | Directly dashboard se approve, comment, merge |

---

## 💥 Impact — Farak Kya Padta Hai?

### ⏱️ Time Bachta Hai
Ek average PR review jo pehle 15-20 minute leta tha — ab **5 minute** mein ho jaata hai. AI pehle hi critical issues flag kar deta hai, aap sirf important cheezein check karo.

### 🧠 Better Reviews
Human reviewer thak jaata hai, distracted hota hai. AI nahi. Har PR pe same quality ka review — **missing null checks se leke SQL injection tak** — consistently.

### 🏗️ Project-Aware Feedback
Yeh sirf generic linter nahi hai. BitPilot aapka codebase index karta hai — architecture, patterns, conventions samajhta hai — aur ussi context mein review deta hai. "Is project mein error handling aise hoti hai, yahan nahi ki" — woh level ka feedback.

### 🚀 Deploy Confidence
Merge karo, staging PR automatically banta hai, merge hota hai, 16-minute timer shuru — aur jab deploy complete ho toh notification. **Zero manual follow-up.**

### 💰 Cost-Effective
Teen AI providers support karta hai:
- **OpenAI** (GPT-4o) — agar API key hai
- **Claude API** — agar Anthropic use karte ho
- **Claude CLI** — **bilkul free**, agar Claude Code installed hai

---

## 🚀 Quick Start

### 1. Apne project ke root mein clone karo

```bash
cd /your/project
git clone https://github.com/your-username/bitpilot
cd bitpilot
npm run install:all
```

### 2. Start karo

```bash
npm run dev
```

Opens at **http://localhost:5173**

Pehli baar open karoge toh ek **setup wizard** aayega — 1 minute mein sab configure ho jaata hai.

### 3. .env se configure karo (optional)

```bash
cp .env.example .env
# Edit .env with your credentials
```

---

## ⚙️ Configuration

Settings UI se sab kuch set kar sakte ho. Changes `config.json` mein save hote hain (gitignored).

### Bitbucket

| Field | Description |
|-------|-------------|
| Workspace | `bitbucket.org/<workspace>/` wala slug |
| Email | Aapka Bitbucket account email |
| Username | Aapka Bitbucket username |
| App Password | Bitbucket Settings → App passwords → `Repositories: Read` + `Pull requests: Read + Write` |

### AI Provider — Teen Options

| Provider | Key Chahiye? | Best For |
|----------|-------------|----------|
| **OpenAI** | Haan — `sk-...` | Most reliable, GPT-4o |
| **Claude API** | Haan — `sk-ant-...` | Claude Sonnet / Opus |
| **Claude CLI** | Nahi — free! | Claude Code installed ho toh |

### Deploy Notifications

| Field | Description |
|-------|-------------|
| Zoho Cliq Webhook URL | Channel → Incoming Webhook URL (`?zapikey=...` wali) |
| Generic Webhook URL | Koi bhi endpoint jo `POST { "text": "..." }` accept kare — Slack, Discord, custom |

---

## 📖 Usage

### PR Review Karna

1. Dashboard se koi bhi repo open karo
2. PR click karo
3. **Overview tab** — PR summary (AI auto-generate karta hai)
4. **Diff tab** — syntax-highlighted diff
5. **Comments tab** — read + post comments
6. **AI Review tab** — "Run AI Review" click karo

### AI Review Workflow

1. Review run karo — findings **Critical / High / Medium / Low** mein grouped milenge
2. Har finding mein: file, line number, issue type, description, aur suggested fix
3. Jo findings post karni hain select karo → **Post Selected Comments**
4. Findings post hone ke baad **Approve** aur **Merge** buttons appear hote hain

### Codebase Intelligence

Ek baar index karo — phir saare reviews project-aware honge:

1. Kisi bhi repo ki PR list mein jao
2. **Index Codebase** click karo
3. Tool local files scan karta hai (agar project ke andar rakha hai) ya Bitbucket API fallback
4. `server/codebase-contexts/` mein store hota hai

### Staging Deploy Flow

PR merge karne ke baad:
1. Prompt aata hai: **Merge to staging?**
2. Confirm karo → staging PR banta hai, approve + merge automatic
3. 16-minute countdown timer shuru
4. Timer end → browser notification + Zoho Cliq / webhook message

---

## 🗂️ Project Structure

```
bitpilot/
├── server/
│   ├── index.js              # Express server (port 3001)
│   ├── config.js             # Config read/write (config.json + .env)
│   └── routes/
│       └── bitbucket.js      # All API routes + AI integration
├── client/
│   └── src/
│       ├── api/bitbucket.js  # Frontend API client
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── RepoPRs.jsx
│       │   ├── PRReview.jsx
│       │   └── Settings.jsx
│       └── components/
│           ├── OnboardingWizard.jsx
│           ├── DiffViewer.jsx
│           └── Layout.jsx
├── .env.example
└── package.json
```

---

## 🏗️ Production Build

```bash
npm run build   # React frontend build karo
npm start       # Production server (frontend + API same port 3001)
```

---

## 🛠️ Troubleshooting

**Port 3001 already in use**
Dev script automatically port free karta hai. Agar phir bhi issue ho: `fuser -k 3001/tcp`

**Bitbucket 400 on merge**
PR OPEN hona chahiye aur merge conflicts nahi hone chahiye. Error message exact reason batayega.

**AI Review tab nahi dikh raha**
Settings mein AI provider configure karo aur save karo.

**Codebase index "Bitbucket API" dikh raha hai instead of "local files"**
`bitpilot` folder ko apne project ke root mein rakho (standalone nahi), phir re-index karo.

---

## 🧰 Tech Stack

- **Frontend** — React 18, Vite, Tailwind CSS, React Router v6, Lucide icons
- **Backend** — Node.js, Express
- **AI** — OpenAI Chat Completions / Anthropic Messages API / Claude CLI
- **Storage** — File-based (`config.json`, `codebase-contexts/`) — no database

---

## 📄 License

MIT — use karo, modify karo, ship karo. Free hai. 🚀
