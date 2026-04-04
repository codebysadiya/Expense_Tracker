# ExpenseAI - AI-Powered Smart Expense Tracker

A full-stack expense tracking web application with intelligent natural language input, behavioral analysis, spending predictions, and an AI-powered financial chatbot. Built with Next.js 16, Firebase, and Tailwind CSS.

## Features

- **Expense Management** — Add, edit, delete, and filter expenses by category and month
- **Budget Tracking** — Set monthly budgets, track progress, receive alerts at 80% and when exceeded
- **Savings Goals** — Create goals with progress visualization and deadline tracking
- **Debts & Collections** — Track money lent to or borrowed from others with settlement status
- **AI Chatbot** — Natural language commands ("Add $50 for groceries") and data queries ("What's my expense to budget ratio?") powered by a hybrid NLP engine with AI fallback
- **Behavioral Insights** — Spending pattern analysis, anomaly detection (z-score), smart recommendations
- **Spending Predictions** — End-of-month and next-month projections using linear regression
- **Export Reports** — Download Excel (.xlsx) and PDF reports with full financial summaries
- **Dashboard** — Charts (pie, bar, line), stats cards, monthly trends via Recharts
- **Calculator** — Draggable Mac-style calculator with keyboard support
- **Mobile Responsive** — Works on all screen sizes

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Database:** Firebase Firestore
- **Auth:** Firebase Authentication (email/password)
- **Styling:** Tailwind CSS v4
- **Charts:** Recharts
- **AI Fallback:** Hugging Face Inference API (Qwen 2.5-7B, free tier)
- **Deployment:** Vercel

## Prerequisites

- **Node.js** 18+ (20 recommended)
- **npm** 8+
- A **Firebase** project (free tier works)
- A **Hugging Face** account (optional, for AI fallback — free tier)

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/your-username/expense-tracker.git
cd expense-tracker
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com) and create a new project (or use an existing one)
2. **Enable Authentication:**
   - Go to Build > Authentication > Get Started
   - Click Sign-in method > Email/Password > Enable > Save
3. **Create Firestore Database:**
   - Go to Build > Firestore Database > Create database
   - Select "Start in test mode" or use these production rules:
     ```
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         match /{document=**} {
           allow read, write: if request.auth != null;
         }
       }
     }
     ```
   - Choose a region close to you > Enable
4. **Get your Firebase config:**
   - Go to Project Settings (gear icon) > General > Your apps > Web app
   - Click "Add app" if you haven't already, register it
   - Copy the config values

### 4. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your Firebase config:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 5. (Optional) Set up AI Fallback

The AI chatbot works without this — it uses a local NLP engine for common commands. The Hugging Face token adds a smart fallback for unusual phrasing.

1. Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Create a free access token
3. Add to `.env.local`:

```env
HF_TOKEN=hf_your_token_here
```

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 7. Create an account

1. Click "Sign Up" on the landing page
2. Enter your email and password
3. Start adding expenses!

## Project Structure

```
expense-tracker/
├── app/                    # Next.js App Router pages
│   ├── api/                # Serverless API routes
│   │   ├── chat/           # AI chatbot endpoint
│   │   └── insights/       # Financial analysis endpoint
│   ├── budget/             # Budget management page
│   ├── dashboard/          # Main dashboard with charts
│   ├── debts/              # Debts & collections page
│   ├── expenses/           # Expense CRUD page
│   ├── insights/           # AI insights & predictions page
│   ├── login/              # Login page
│   ├── savings/            # Savings goals page
│   └── signup/             # Registration page
├── components/             # Reusable UI components
│   ├── AIChat.tsx          # Floating AI chatbot
│   ├── BudgetProgress.tsx  # Budget bar with alerts
│   ├── Calculator.tsx      # Draggable calculator
│   ├── ExportMenu.tsx      # Excel/PDF export dropdown
│   ├── ExpenseForm.tsx     # Add/edit expense form
│   ├── InsightCard.tsx     # Insight display card
│   ├── Modal.tsx           # Reusable modal component
│   ├── Navbar.tsx          # Navigation with profile dropdown
│   └── StatCard.tsx        # Statistics card
├── context/                # React context providers
│   └── AuthContext.tsx      # Firebase Auth context
├── lib/                    # Core libraries
│   ├── api.ts              # Client API helpers
│   ├── firebase.ts         # Firebase client initialization
│   ├── firestore.ts        # Firestore CRUD operations
│   ├── types.ts            # TypeScript type definitions
│   └── useDataRefresh.ts   # Auto-refresh hook for AI actions
└── utils/                  # Business logic
    ├── ai-fallback.ts      # Hugging Face AI fallback
    ├── analysis.ts         # Spending analysis functions
    ├── anomaly.ts          # Anomaly detection (z-score)
    ├── export.ts           # Excel & PDF report generation
    ├── nlp.ts              # Local NLP engine (intent + entity extraction)
    ├── predictions.ts      # Spending prediction algorithms
    └── recommendations.ts  # Smart spending recommendations
```

## AI Chatbot Commands

| Command | Example |
|---|---|
| Add expense | "Add $50 for groceries" |
| Add expense | "Spent $15 on uber yesterday" |
| Set budget | "Set budget to $3000" |
| Add debt | "John owes me $50 for dinner" |
| Add debt | "I owe Sarah $100 for tickets" |
| Savings goal | "Create vacation goal for $5000 by December" |
| Query spending | "How much did I spend this month?" |
| Budget status | "Am I over budget?" / "How much can I still spend?" |
| Category info | "What did I spend most on?" |
| Comparison | "Compare this month to last month" |
| Debt summary | "Who owes me money?" |
| Affordability | "Can I afford $200?" |

## Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add the same environment variables from `.env.local` in Vercel's project settings
4. Deploy

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## License

MIT
