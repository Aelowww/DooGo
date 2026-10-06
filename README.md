# DooGo

**Connecting donors. Saving lives.**

DooGo is a blood donation web app that connects people who need blood with compatible, verified donors nearby. Seekers can request blood for a patient and track every response. Donors control their availability, and the app follows real donation rules so nobody is asked to give before they're ready.

Built with **Next.js 16** (App Router), **React 19**, **TypeScript**, CSS Modules, and **Firebase** (Authentication and Firestore). It works on phones and desktops, with a layout designed for each.

## Features

**For people who need blood**
- Request blood with blood type, number of bags, urgency (critical, urgent, or standard), hospital, needed-by date, and up to 5 cities to search.
- See only compatible donors who can donate in time, then ask one donor or several at once.
- Track each request from sent to accepted to donated, with a bag-by-bag progress bar.
- Chat with a donor as soon as they accept, to agree on a time.

**For donors**
- Upload a medical record (blood typing result, medical certificate, donor card, or lab results) to get a **Verified** badge and appear in searches.
- Turn availability on or off from one Donating page that also shows eligibility and donor details.
- Accept requests only when it's medically possible (see the rules below).
- Track donations and earn milestone badges.

**For everyone**
- A live city view on the dashboard: donors available and blood requests open.
- In-app notifications, unread badges, and floating confirmations after saving.
- Privacy controls for what appears on your public donor card.
- Desktop layout with a branded header and breadcrumbs; mobile layout with a bottom navigation bar.

## Donation rules

DooGo follows WHO and Philippine Red Cross guidance for whole-blood donation:

| Rule | How DooGo applies it |
| --- | --- |
| **Compatibility** | ABO and Rh compatibility decides which donors appear and which requests a donor can accept. |
| **Waiting period** | 12 weeks between donations for men, 16 weeks for women (16 weeks when sex isn't given). A donor who is still recovering can accept only if they'll be ready by the needed-by date. |
| **One donor, one unit** | Each donor gives one unit (about 450 ml), so a 3-bag request needs 3 donors. A request closes once every bag has been donated, and other donors see when it's already covered. |
| **One commitment at a time** | A donor who has accepted a request must complete it before accepting another. |
| **Medical record** | Required before a donor can become available. The hospital still screens every donor on the day. |
| **Expiry** | Requests can't be accepted after their needed-by date. |

## Security

- Firestore security rules check every write. Each document accepts only its known fields, with length limits and valid values.
- "Verified" and appearing in searches both require a medical record that actually exists.
- Names on requests must match the public donor profiles, so nobody can pose as someone else.
- Notification links must point inside the app, and sign-in redirects only accept in-app paths.
- Private data (email, phone, birthday, medical record photo) is readable only by its owner. Deleting an account also deletes the medical record and notifications.
- Security headers: Content-Security-Policy, HSTS, X-Frame-Options, and more (see `next.config.ts`).
- Passwords need at least 8 characters, upper and lower case letters, a number, and a symbol, and can't contain your name or email.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Firebase project at <https://console.firebase.google.com>, then:
   - **Authentication** → Sign-in method → enable **Email/Password**.
   - **Firestore Database** → create a database.
   - **Project settings** → General → *Your apps* → add a **Web app** and copy its config.

3. Copy `.env.example` to `.env.local` and paste your web app config values.

4. Publish the security rules. Either paste `firebase/firestore.rules` into **Firestore → Rules** in the console, or use the [Firebase CLI](https://firebase.google.com/docs/cli):

   ```bash
   firebase use --add
   firebase deploy --only firestore:rules,firestore:indexes
   ```

5. Run the app and open <http://localhost:3000>:

   ```bash
   npm run dev
   ```

   Windows 1024px and wider get the desktop layout; phones and narrow windows get the mobile layout. Resizing the window switches between them.

### Demo data (optional)

Creates demo accounts with requests in every state, chats, and donations, so every screen has something to show. All demo accounts use the password `DooGo1234!` (for example `carl.demo@doogo.test`).

```bash
npx tsx --env-file=.env.local scripts/seed-demo.ts
```

Use a separate Firebase project for demo data, so demo donors don't appear to real users.

## Deploying

The app runs on any host that supports Next.js, such as Vercel:

1. Import the repository and add the `NEXT_PUBLIC_FIREBASE_*` variables from `.env.example`.
2. In Firebase, add your domain under **Authentication → Settings → Authorized domains**.
3. Recommended: turn on email enumeration protection, a password policy, and App Check in the Firebase console.

## Project structure

Screens live under `app/mobile/`. The `app/desktop/` routes re-export the same screens, and the shared `Screen` component renders the right shell for each layout. `proxy.ts` rewrites clean URLs (`/home`, `/requests`, …) to the layout that fits the device.

```
app/
  layout.tsx, globals.css         Root layout and design tokens
  _components/                    Auth session, layout switch, toasts, icons
  desktop/                        Desktop routes (re-export the mobile screens)
  mobile/
    _components/                  Shared UI: Screen, header, navigation, forms, medical record, city picker, …
    splash/ sign-in/ create-account/ forgot-password/ password-reset/ terms/ privacy-policy/ help/
    (app)/                        Signed-in screens
      home/ notifications/ onboarding/
      request-blood/ donors/ request-sent/
      requests/ messages/
      donate/ donate/setup/
      profile/
lib/
  blood.ts                        Compatibility, waiting periods, and eligibility checks
  requests.ts needs.ts            Requests and the public per-city request summary
  users.ts medical.ts             Profiles, donor cards, medical records
  messages.ts notifications.ts    Chat and notifications
  password.ts                     Password rules and strength
  firebase/ format.ts locations.ts layout.ts photo.ts
firebase/                         Firestore security rules and indexes
scripts/                          Demo data seeding
```

## Data model (Firestore)

| Collection | Who can read | Purpose |
| --- | --- | --- |
| `users/{uid}` | Owner only | Private profile: name, email, phone, birthday, blood info, settings |
| `medicalRecords/{uid}` | Owner only | The uploaded medical record photo |
| `donors/{uid}` | Signed-in users | Public donor card: short name, blood type, city, availability, verified |
| `requests/{id}` | Requester and donor | Requests: `pending → accepted/declined → completed`, or `cancelled` |
| `needs/{id}` | Signed-in users | Anonymous summary of each request (city, type, bags) for live counts and coverage |
| `notifications/{id}` | Recipient | In-app notifications |
| `conversations/{a_b}/messages` | Both participants | Chat between a seeker and a donor |
