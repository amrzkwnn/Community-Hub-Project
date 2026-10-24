<p align="center">
  <img src="public/nadikomuniti/01_branding/logo-header-tagline-horizontal.webp" alt="NadiKomuniti — Connect & Relax" width="340" />
</p>

<h1 align="center">NadiKomuniti</h1>

<p align="center">
  <strong>Connect &amp; Relax</strong><br />
  <em>A smarter township begins with a more connected community.</em>
</p>

<p align="center">
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16.4.2-black?logo=next.js" alt="Next.js" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-4.x-38B2AC?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></a>
  <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-PostgreSQL_%7C_Auth_%7C_Realtime-3ECF8E?logo=supabase&logoColor=white" alt="Supabase" /></a>
  <a href="https://ai.google.dev/"><img src="https://img.shields.io/badge/Google_Gemini-2.5_Flash-8E75C4?logo=google&logoColor=white" alt="Google Gemini" /></a>
  <a href="https://community-hub-project-eta.vercel.app"><img src="https://img.shields.io/badge/Vercel-Deployed-000000?logo=vercel&logoColor=white" alt="Vercel" /></a>
</p>

<p align="center">
  <a href="https://community-hub-project-eta.vercel.app/welcome"><strong>🌐 Live Landing Page</strong></a> &nbsp;&bull;&nbsp;
  <a href="https://community-hub-project-eta.vercel.app/?tab=home"><strong>🏡 Open Community Hub</strong></a> &nbsp;&bull;&nbsp;
  <a href="https://community-hub-project-eta.vercel.app/?tab=resilience"><strong>🗺️ Resilience Map</strong></a>
</p>

---

A full-stack, responsive Community Hub and Civic Operating System designed specifically for Malaysian master-planned townships (Bandar Elmina, Denai Alam, Bukit Jelutong, and Sime Darby Property developments). Engineered with **Next.js 16 (App Router with Turbopack)**, **TypeScript**, **Tailwind CSS 4**, **Supabase (PostgreSQL, Auth, RLS & Realtime)**, and **Google Gemini AI**.

🌐 **Live Production URL**: [https://community-hub-project-eta.vercel.app](https://community-hub-project-eta.vercel.app)

---

## 📑 Table of Contents

- [🎯 Core Objectives & Township Identity](#-core-objectives--township-identity)
- [🌟 Key Features & Modules](#-key-features--modules)
  - [1. Home Dashboard & Mobile Experience](#1-home-dashboard--mobile-experience)
  - [2. Civic Resilience Map (Peta Ketahanan Awam)](#2-civic-resilience-map-peta-ketahanan-awam)
  - [3. Community Feed & Discussions (Komuniti)](#3-community-feed--discussions-komuniti)
  - [4. Circular Economy & Tool Exchange (Pertukaran Barang)](#4-circular-economy--tool-exchange-pertukaran-barang)
  - [5. Hyperlocal Services & Gig Sharing (Servis Komuniti)](#5-hyperlocal-services--gig-sharing-servis-komuniti)
  - [6. Mediated Privacy-Preserving Messaging (Mesej Peribadi)](#6-mediated-privacy-preserving-messaging-mesej-peribadi)
  - [7. Management & JMB Intelligence Console (Pusat Pengurusan)](#7-management--jmb-intelligence-console-pusat-pengurusan)
  - [8. Wall-Mounted Tablet Kiosk (Kiosk Dinding)](#8-wall-mounted-tablet-kiosk-kiosk-dinding)
- [🤖 Google Gemini AI Civic Integration](#-google-gemini-ai-civic-integration)
- [🔄 Production Database Synchronization Architecture](#-production-database-synchronization-architecture)
- [🔐 Security, Roles & Verification Workflow](#-security-roles--verification-workflow)
- [📂 Project Structure](#-project-structure)
- [🚀 Quick Start & Local Setup](#-quick-start--local-setup)
- [📦 Database Migrations & Seeding](#-database-migrations--seeding)
- [🌐 Production Deployment on Vercel](#-production-deployment-on-vercel)
- [📄 License](#-license)

---

## 🎯 Core Objectives & Township Identity

**NadiKomuniti** addresses the real-world civic, disaster resilience, and community coordination challenges of large-scale Malaysian master-planned townships:

- **Immediate Civic & Flood Resilience**: Bandar Elmina's geography requires proactive flood, storm, and infrastructure hazard reporting with automatic deduplication, live status verification, and direct rapid dispatch to JMB and emergency responders (MBSA, Bomba, PDRM).
- **Resident Privacy Protection**: Neighbours can collaborate, report civic deficiencies, trade goods, and message each other without exposing private phone numbers, home unit numbers, or physical identities.
- **Circular Economy & Zero Waste**: Hyperlocal tool lending, pre-loved exchanges, and plant cuttings sharing minimize landfill waste and build neighborhood self-reliance.
- **Transparent JMB/Management Operations**: Real-time audit trails, MTTR (Mean Time to Resolution) analytics, and AI-assisted moderation ensure civic complaints are addressed constructively without suppression.

---

## 🌟 Key Features & Modules

### 1. Home Dashboard & Mobile Experience
- **Adaptive Dual Experience**: Desktop features a two-column layout with quick actions and official notices; mobile delivers a tactile interface built according to modern mobile design standards.
- **Township Canvas**: High-resolution continuous photographic canvas with multi-stage backdrop blur overlays for AAA contrast and readability.
- **Swipeable Quick-Access Carousel**:
  - **Resilience Map**: View active AEDs, safe evacuation points, and radar incidents (**View Map**).
  - **Circular Exchange**: Pre-loved furniture, gardening equipment, and tool loans.
  - **Local Services**: Real-time counter of verified service offerings available in the neighborhood.
  - **Direct Messages**: Masked, privacy-first private resident chat.
- **Official Civic Notices**: High-priority broadcasts with category indicators, timestamping, and reading modal.
- **Interactive Community Calendar**:
  - Live month navigation (`<`, `>`) localized to Malaysian Standard Time (`Asia/Kuala_Lumpur`).
  - Interactive day chip selector showing weekday names, day numbers, event dots, and today indicators.
  - Single-click RSVP toggle and detailed event schedule modals.
- **Live Account Switcher**: Fast persona switching directly from the top navigation bar to test role permissions across Resident, Security, Management, and Committee members.

### 2. Civic Resilience Map (Peta Ketahanan Awam)
- **Interactive Geospatial Mapping**: Powered by Leaflet and OpenStreetMap, centered on Bandar Elmina and Denai Alam.
- **Incident Categorization**:
  - Flash Floods & Water Accumulation (*Banjir / Takungan Air*)
  - Fallen Trees & Storm Debris (*Pokok Tumbang*)
  - Blocked Storm Drains (*Longkang Tersumbat*)
  - Potholes & Road Hazards (*Jalan Rosak*)
  - Street Light & Power Outages (*Lampu Jalan Rosak*)
  - Water Supply Disruptions (*Gangguan Bekalan Air*)
  - Waste Dumping & Township Misconduct
- **Civic Deduplication Engine**: Proximity-based detection (±300 meters) detects duplicate incident submissions and links reports into unified threads.
- **Official Verification Lifecycle**:  
  `Reported` ➔ `Management Verified (Under Review)` ➔ `Dispatched to Field Crew` ➔ `Resolved` ➔ `Soft Archived`.
- **Emergency Hotlines**: Direct rapid dialers for MBSA, Balai Polis Shah Alam, Pasukan Bomba, and Sime Darby Property auxiliary dispatch.

### 3. Community Feed & Discussions (Komuniti)
- **Structured Categories**: Announcements, Neighborhood Discussions, Local Complaints, and Upcoming Events.
- **Anonymous Reporting Toggle**: Residents can report sensitive infrastructure issues or safety hazards anonymously to neighbours while maintaining verified audit trails with management.
- **Threaded Civic Replies**: Official management responses are pinned with distinctive verification badges.
- **Social Engagement**: Local upvoting, comment threads, and real-time activity synchronization.

### 4. Circular Economy & Tool Exchange (Pertukaran Barang)
- **Zero-Waste Categories**: Free Giveaways (*Percuma*), Barter Exchanges (*Tukar Barang*), and Tool Loans (*Pinjaman Alatan*).
- **Precinct Filtering**: Filter listings by Elmina Green 1–3, Elmina Valley, Denai Alam, City Center, and surrounding areas.
- **Item Condition Standards**: Transparent tags (`brand_new`, `like_new`, `good`, `fair`).
- **Reservation Lock**: Residents can reserve items with one click, updating the status across all devices to prevent double claims.

### 5. Hyperlocal Services & Gig Sharing (Servis Komuniti)
- **Neighborhood Mutual-Aid**: Offer and request services within verified residential precincts.
- **Service Categories**: Carpools to MRT Kwasa Sentral / LRT Subang, SPM Science & Math Tutoring, Pet Sitting & Grooming, Plumbing & Electrical Maintenance, and Gardening.
- **Trust Verification**: Enforces verified homeowner/tenant status before listings appear publicly.

### 6. Mediated Privacy-Preserving Messaging (Mesej Peribadi)
- **Masked Identity Protocol**: Communication between residents uses privacy handles (e.g., *"Elmina Green Neighbour"*) without exposing phone numbers or exact addresses.
- **Contextual Inquiries**: Start private chats directly from service offers, circular exchange items, or management notices.
- **Real-Time Delivery**: Messages synchronize seamlessly across devices via Supabase Realtime.

### 7. Management & JMB Intelligence Console (Pusat Pengurusan)
- **Incident Triage & Dispatch**: Management staff can assign dedicated field teams (e.g., *Elmina Rapid Drainage Unit*) and log internal operational notes.
- **Resident Verification Adjudication**: Review pending Tenancy Agreements and S&P proof documents to grant verified status.
- **Operational Analytics Dashboard**: Mean Time to Resolution (MTTR), incident resolution velocity, weekly breakdown, and exportable CSV/JSON reports.
- **Audit Logging**: Every action (incident verification, post creation, role change, account switch) generates an immutable audit record.

### 8. Wall-Mounted Tablet Kiosk (Kiosk Dinding)
- **Hardware-Optimized Mode**: High-contrast, large touch-target interface designed for resident association clubhouses, guardhouses, and lift lobbies.
- **Emergency Broadcast Display**: Displays active severe weather advisories, flood gauge telemetry, and visitor guidelines.
- **One-Tap SOS Dispatch**: Instant emergency dialer for security guards and residents.

---

## 🤖 Google Gemini AI Civic Integration

The platform leverages **Google Gemini AI** (`gemini-2.5-flash` / `gemini-3-flash-preview`) via server-side endpoints:

| Feature | Endpoint | Description |
| :--- | :--- | :--- |
| **Nadi AI Assistant** | `/api/ai/assistant` | Multi-turn bilingual (English & Bahasa Melayu) conversational assistant featuring the animated Nadi mascot. Answers questions about precinct rules, waste schedules, management contacts, and civic services. |
| **Smart Civic Search** | `/api/ai/assistant` | Natural language intent recognition across incidents, feed posts, circular items, and local services. |
| **AI Safety & Moderation** | `/api/ai/moderate` | Automated content evaluation checking against township civic guidelines (spam, harassment, fraud). Features strict **negative guardrails** to protect legitimate resident complaints and constructive criticism from false-positive suppression. |
| **Circular Value Estimator** | `/api/ai/exchange-assist` | Suggests fair community trade values, condition assessments, and description enhancements for items listed on the exchange. |
| **Management Intelligence** | `/api/management/assistant` | Executive operational summaries, anomaly detection in civic maintenance, and automated weekly incident workload digests. |

---

## 🔄 Production Database Synchronization Architecture

To support seamless cross-device collaboration across smartphones, tablets, and desktop browsers, the hub implements a robust synchronization pipeline:

```
[ Client Browser A (Mobile) ]           [ Client Browser B (Desktop) ]
              │                                       ▲
              │ 1. POST Mutation                      │ 4. Realtime Broadcast
              ▼                                       │    ('tesdh-sync')
   ┌────────────────────────────────────────────────────────┐
   │               Next.js Route: /api/sync                  │
   │  - Persona UUID Mapping (toDatabaseUserId)             │
   │  - Service Role Privilege Bridge                       │
   │  - Check-Constraint Enum Validation                    │
   └────────────────────────────────────────────────────────┘
              │                                       ▲
              ▼                                       │
   ┌───────────────────────┐             ┌─────────────────────────┐
   │  Supabase PostgreSQL  │────────────▶│ Supabase Realtime Channel│
   │  Database Tables      │             │ ('tesdh-live-sync')     │
   └───────────────────────┘             └─────────────────────────┘
```

1. **Authenticated Service Bridge**: Demo personas (`user-nurul`, `user-vikram`, `user-azman`) map transparently to canonical database UUIDs via `toDatabaseUserId`.
2. **Realtime Broadcast**: Any mutation (incident report, verification, post creation, comment, exchange reservation, service listing, or chat message) broadcasts across channel `tesdh-live-sync`.
3. **Resilient In-Memory Fallback**: Serverless containers maintain an active in-memory cache, ensuring high performance even during cold starts or transient connectivity dips.

---

## 🔐 Security, Roles & Verification Workflow

### Role-Based Access Control (RBAC)

| Role | Permissions |
| :--- | :--- |
| **Resident** (`resident`) | Browse public feeds, submit incident reports, create barter listings, offer services, participate in discussions, and send mediated messages. |
| **Security Officer** (`security`) | All resident privileges plus incident triage, guardhouse dispatch, rapid SOS coordination, and kiosk management. |
| **Management** (`management`) | Full administrative console access: verify incidents, assign field teams, soft-archive records, approve resident tenancy proof, and review AI moderation cases. |
| **Moderator** (`moderator`) | Adjudicate flagged community content, soft-delete policy violations, and enforce civic community guidelines. |

### 3-Stage Resident Verification Workflow
1. **Registration**: Residents register their name, email, phone number, and residential address (`unverified`).
2. **Proof Submission**: The resident uploads their Tenancy Agreement, S&P agreement, or utility bill (`pending`).
3. **Management Review**: Management reviews the document in the **Pusat Pengurusan** console and clicks **Verify Resident** (`verified`). Verified residents receive verified badges across the directory and feeds.

---

## 📂 Project Structure

```
├── .github/                      # CI/CD Workflows
├── public/                       # Static assets and township photographs
│   ├── images/                   # Elmina background & UI imagery
│   ├── nadikomuniti/             # Official branding, Nadi mascot frames & showcase assets
│   │   ├── 01_branding/          # Brand logos, wordmarks & icons
│   │   ├── 02_nadi_mascot/       # Animated Nadi mascot sprite frames
│   │   ├── 03_landing_feature_visuals/ # Feature cards visual assets
│   │   ├── hero/                 # Transparent device mockups
│   │   ├── how_it_works/         # 3-step reporting workflow illustrations
│   │   └── showcase/             # Resident & Management interface showcases
│   ├── favicon.ico               # Multi-resolution favicon
│   └── manifest.json             # Progressive Web App (PWA) manifest
├── src/
│   ├── app/                      # Next.js 16 App Router
│   │   ├── api/
│   │   │   ├── ai/               # Gemini AI assistant & moderation endpoints
│   │   │   ├── management/       # Operational analytics & intelligence
│   │   │   ├── moderation/       # Moderation queue and audit endpoints
│   │   │   └── sync/             # Production database sync & Realtime bridge
│   │   │       ├── route.ts      # GET & POST sync handler
│   │   │       └── health/       # Real-time synchronization health check
│   │   ├── welcome/              # NadiKomuniti landing experience (/welcome)
│   │   │   ├── landing.css       # Dedicated landing page styling
│   │   │   └── page.tsx          # Landing page component
│   │   ├── layout.tsx            # Global layout with theme, metadata & AppProvider
│   │   └── page.tsx              # Main Community Hub application shell
│   ├── components/               # Modular React UI components
│   │   ├── ai/                   # Nadi Mascot & Floating AI Assistant
│   │   ├── common/               # Shared badges, modals, time formatters
│   │   ├── exchange/             # Circular exchange & barter components
│   │   ├── feed/                 # Community discussions & announcements
│   │   ├── home/                 # Desktop & Mobile Home views
│   │   ├── kiosk/                # Touchscreen wall kiosk interface
│   │   ├── management/           # JMB Admin console, analytics & AI insights
│   │   ├── messages/             # Mediated private messaging interface
│   │   ├── navigation/           # Responsive Header, Sidebar & Mobile drawer
│   │   ├── resilience/           # Geospatial Leaflet map & incident reporting
│   │   ├── services/             # Local service directory & gig exchange
│   │   └── settings/             # User settings, accessibility & theme
│   ├── config/                   # Township features & precinct definitions
│   ├── lib/
│   │   ├── context/              # AppContext state, sync & real-time hooks
│   │   ├── data/                 # Seed datasets & Malaysian demo personas
│   │   ├── i18n/                 # Bilingual translations (EN & BM)
│   │   ├── server/               # Server-side Supabase, Gemini AI & analytics
│   │   │   ├── aiModeration.ts   # Civic guideline moderation engine
│   │   │   ├── aiSearch.ts       # Intent-based semantic search
│   │   │   ├── dbSync.ts         # Admin database sync & UUID mapping
│   │   │   └── geminiClient.ts   # Official Google Gemini API client
│   │   ├── supabase/             # Cookie-based Supabase SSR client setup
│   │   └── utils/                # Date formatting & event schedule utilities
│   └── types/                    # Comprehensive TypeScript definitions
├── supabase/
│   └── migrations/               # PostgreSQL schemas, RLS policies & seed data
├── next.config.ts                # Next.js configuration (Turbopack, partial prerender)
├── tailwind.config.ts            # Tailwind styling tokens & design system
└── tsconfig.json                 # Strict TypeScript configuration
```

---

## 🚀 Quick Start & Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/amrzkwnn/Community-Hub-Project.git
cd Community-Hub-Project
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Populate the required keys in `.env.local`:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://your-supabase-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Google Gemini AI Key
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-2.5-flash"

# Township Identity
NEXT_PUBLIC_COMMUNITY_NAME="NadiKomuniti (Bandar Elmina)"
```

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Database Migrations & Seeding

The database schemas and seed datasets are managed via Supabase SQL migrations:

1. **Core Schema (`20261016140000_tesdh_core_schema.sql`)**:  
   Creates tables for `profiles`, `announcements`, `community_posts`, `comments`, `service_listings`, `exchange_listings`, and `community_reports` with Row Level Security (RLS) enabled.
2. **Seed Data (`20261016140100_tesdh_seed_data.sql`)**:  
   Populates realistic Malaysian demo profiles (*Nurul Huda*, *Vikram Malhotra*, *Dato Azman*, *Sarjan Rosli*) and initial community content.
3. **Advanced Features (`20261016150000_tesdh_v2_features.sql`)**:  
   Adds support for audit logging, content flagging, and private messaging.

---

## 🌐 Production Deployment on Vercel

The application is deployed on Vercel with automatic continuous deployment linked to the `main` branch.

### Production Build Validation
```bash
# Typecheck
npx tsc --noEmit

# Test Suite
npm test

# Production Build
npm run build
```

Production environments require the following environment variables configured in the Vercel Project Settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`

---

## 📄 License

Developed for the Sime Darby Property Township Hackathon. Built to empower sustainable, resilient, and connected communities across Malaysia.
