# TESDH Community Hub (Township Ecosystem for Sime Darby Communities)

A full-stack, responsive Community Hub web application engineered for Malaysian townships (Bandar Elmina, Denai Alam, Bukit Jelutong, and Sime Darby Property developments). Built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase (PostgreSQL, Auth, and Row Level Security)**.

---

## 🌟 Key Features

1. **Komuniti (Community Feed)**
   - Categorised feeds: Pengumuman, Perbincangan, Acara Kejiranan, Aduan Awam.
   - Anonymous reporting toggle (prevents neighbour retaliation while keeping identity accessible to management).
   - Real-time updates and community upvoting.

2. **Ketahanan & Peta Bencana (Civic Resilience Map)**
   - Interactive OpenStreetMap/Leaflet geospatial map centered on Bandar Elmina / Denai Alam.
   - Incident tracking: Banjir / Takungan Air, Pokok Tumbang, Longkang Tersumbat, Gangguan Bekalan Air, Lampu Jalan Rosak.
   - Severity tags (Kritikal, Tinggi, Sederhana, Rendah), emergency contact numbers (MBSA, Balai Polis, Pasukan Bomba, Bilik Gerakan Sime Darby).
   - Smart deduplication warning system.

3. **Pertukaran Barang (Circular Economy & Barter)**
   - Circular economy item sharing: Percuma (Giveaway), Barter / Tukar, Pinjaman Alatan (Tool Loan).
   - Filters by precinct (Elmina Green 1-3, Denai Alam, City Center).

4. **Servis & Kongsi (Local Gig & Carpool Economy)**
   - Hyperlocal offerings and requests: Carpool ke MRT/LRT/Subang, Tuisyen Matematik/Fizik SPM, Penjagaan Kucing, Servis Paip & Elektrik.

5. **Mesej Peribadi (Privacy-Safe Mediated Communication)**
   - Communication between residents without publicly exposing personal unit numbers or phone numbers.
   - Masked identity handles: e.g., *"Penduduk Elmina Green 3"*.

6. **Pusat Pengurusan (Admin & JMB Verification Console)**
   - Incident triage and status dispatch (*Pending* ➔ *Dispatched* ➔ *Resolved*).
   - **Admin-Approved Resident Verification Workflow**:
     - Residents register (`unverified`).
     - Submit Tenancy / S&P proof (`pending`).
     - JMB/Security verifies unit number and credentials (`verified`).

7. **Kiosk Dinding (Wall-Mounted Tablet Mode)**
   - High-contrast, touch-optimized kiosk interface designed for guardhouses, community halls, and lift lobbies.
   - Quick one-tap SOS hotline, flood telemetry alerts, and visitor guidelines.

---

## 🔐 Supabase Architecture & Security

### Cookie-based `@supabase/ssr` Pattern
- **Browser Client**: `src/lib/supabase/client.ts` (`createBrowserClient`)
- **Server Client**: `src/lib/supabase/server.ts` (`createServerClient` with `await cookies()`)
- **Middleware**: `src/lib/supabase/middleware.ts` & `src/middleware.ts` (token refreshing via cookies)

### Tables & Schemas
- `profiles`: Resident identities with role-based access (`resident`, `moderator`, `management`, `security`) and verification status (`unverified`, `pending`, `verified`, `rejected`).
- `public.public_profiles`: Secure view exposing only non-sensitive profile fields (`id`, `full_name`, `display_name`, `role`, `township_precinct`, `avatar_url`), strictly masking confidential unit numbers and phone numbers.
- `announcements`: Official broadcasts from management and security.
- `community_posts`: Discussion feed, complaints, and community activities.
- `comments`: Replies with official management badge indicators.
- `service_listings`: Local freelance services and carpools.
- `exchange_listings`: Zero-waste barter, item giveaways, and tool borrowing.
- `community_reports`: Geospatial incident reports with latitude/longitude.

### Row Level Security (RLS)
- Every table has RLS enabled with strict policies.
- Unit numbers, phone numbers, and private documents are protected.
- Management and security roles have elevated privileges for incident dispatch, verification, and moderation.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node.js 24)
- A Supabase project (Free or Pro tier)

### 2. Environment Variables
Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-or-publishable-key
```

*(Refer to `.env.example` for details. Never commit your keys to version control.)*

### 3. Applying Database Migrations in Supabase

Apply the SQL migration files directly via your **Supabase Dashboard SQL Editor**:

#### Step 1: Open Supabase SQL Editor
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project.
3. Click on **SQL Editor** from the left navigation menu.
4. Click **New query**.

#### Step 2: Apply the Core Schema
1. Open the file:
   [`supabase/migrations/20261016140000_tesdh_core_schema.sql`](./supabase/migrations/20261016140000_tesdh_core_schema.sql)
2. Copy the entire SQL content into the Supabase SQL Editor.
3. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`).
4. Ensure the query returns `"Success. No rows returned"`.

#### Step 3: Apply the Fictional Seed Data
1. Open the file:
   [`supabase/migrations/20261016140100_tesdh_seed_data.sql`](./supabase/migrations/20261016140100_tesdh_seed_data.sql)
2. Copy the entire SQL content into a new query window.
3. Click **Run**.
4. This seeds realistic, fictional Malaysian residents (e.g. *Nurul Huda*, *Vikram Naidu*, *Capt (B) Azman Salleh*, *Sarjan Rosli Bakar*), along with sample announcements, barter items, and flood/drainage incident reports.

---

## 💻 Running the Application

```bash
# Install dependencies
npm install

# Run the development server
npm run dev

# Or build for production
npm run build
npm run start
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🛡️ Resident Verification Workflow

1. **Resident Registration**:
   - Residents click **Log Masuk / Daftar** and register with their email, full name, phone number, and residential unit number (e.g., *No. 12, Jalan Elmina Green 3/2*).
   - Account is initially marked as `unverified`.
2. **Document Submission**:
   - The resident submits proof of residence (e.g. Tenancy Agreement or Utility Bill).
   - Status changes to `pending`.
3. **Admin / Management Approval**:
   - Management or Security officers log in with management credentials and navigate to the **Pusat Pengurusan (Management Console)**.
   - Review pending submissions under the **Pengesahan Penduduk (Resident Verification)** tab.
   - Click **Sahkan Penduduk (Verify)** to grant full posting and community interaction privileges.
