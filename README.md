# DAYMARK — Personal Productivity & Organization System

DAYMARK is a calm, minimal, local-first Progressive Web Application (PWA) designed for iPhone (via Safari) and desktop web browsers. It integrates daily task management, personal reminders, wishlist curation, and an intelligent random purchase picker ("Pick for me").

DAYMARK uses dark obsidian slate styling (`#101114`) with warm gold brass accents (`#D6B56D`), system-responsive layouts, IndexedDB local persistence, offline Service Worker caching, and Web Push notifications.

---

## 1. Features

- **Executive Dashboard**: Time-of-day greeting, live current date, real-time KPI metrics, today's tasks glance, upcoming reminders preview, high-priority blocker overview, and wishlist summary.
- **Task Management**:
  - Full CRUD operations with instant UI response.
  - Priority levels: *Low*, *Normal*, *High*, and *Urgent*.
  - Due dates, times, and categories.
  - Real-time filtering: *All*, *Today*, *Upcoming*, *Overdue*, and *Completed*.
  - Sorting: *Due Date*, *Priority*, *Recently Created*, and *Alphabetical*.
- **Reminder Management**:
  - Time-specific alerts organized into *Today*, *Tomorrow*, *Upcoming*, *Overdue*, and *Completed*.
  - Push notifications via Web Push API (iOS 16.4+ Home Screen & modern desktop browsers) and in-app prompt scheduler.
- **Wishlist Management**:
  - Item tracking with estimated price in Ghana Cedis (`GH₵`), category categorization, product URLs, and acquisition notes.
  - Financial KPI metrics: Total Items, Remaining Items, Estimated Unpurchased Cost, and Acquired Cost.
- **Random Purchase Selection ("Pick for me")**:
  - Distinctive decision-making engine.
  - Strictly selects from unpurchased wishlist items (purchased items are excluded).
  - Restrained shuffle reel animation with instant reveal, direct purchase shortcut, and "Pick again".
- **Local-First Architecture & Data Backup**:
  - Zero third-party telemetry or cloud database tracking. All data is kept securely on-device in IndexedDB.
  - Export all records to a portable JSON backup file.
  - Import and validate existing backups with safety merge protection.
  - Clear all data with explicit safety confirmations.

---

## 2. Project Structure

```text
DAYMARK/
├── index.html                  # Main responsive application shell
├── manifest.webmanifest        # PWA configuration manifest
├── sw.js                       # Service Worker (offline shell & Web Push)
├── README.md                   # Full documentation & setup instructions
├── .gitignore                  # Git ignore rules
│
├── assets/
│   └── icons/
│       ├── favicon.svg         # Crisp vector brand mark
│       ├── icon-192.png        # 192x192 PWA icon
│       ├── icon-512.png        # 512x512 PWA icon
│       ├── apple-touch-icon.png# iOS Safari home screen icon
│       └── maskable-icon.png   # Android / adaptive maskable icon
│
├── css/
│   ├── style.css               # Design system, CSS variables, typography & layout
│   ├── components.css          # Cards, buttons, inputs, modals, toasts, picker reel
│   └── responsive.css          # Safe-area insets, mobile touch targets, desktop layout
│
├── js/
│   ├── app.js                  # Application coordinator, bootstrapping & modal binding
│   ├── database.js             # IndexedDB transactional persistence & seeding
│   ├── state.js                # Reactive state manager & event bus
│   ├── navigation.js           # Multi-view switching (Mobile bottom bar & desktop sidebar)
│   ├── dashboard.js            # Live dashboard calculations & widgets
│   ├── tasks.js                # Task CRUD, filters, sort, and search
│   ├── reminders.js            # Reminder CRUD, scheduling, and view grouping
│   ├── wishlist.js             # Wishlist CRUD, metrics, and currency calculations
│   ├── picker.js               # "Pick for me" random purchase selection engine
│   ├── notifications.js        # Web Push API, permission requests & in-app alerts
│   ├── settings.js             # Preferences, currency switcher, and diagnostics
│   ├── backup.js               # JSON export & strict schema validation import
│   └── utilities.js            # Currency (GH₵), dates, escaping (XSS safe), UUIDs
│
├── server/                     # Lightweight Node.js Web Push backend
│   ├── package.json            # Express, Web-Push, CORS, Dotenv
│   ├── server.js               # Express API and static file hosting
│   ├── scheduler.js            # Background polling worker for due reminders
│   ├── push.js                 # VAPID key signing and push dispatcher
│   ├── database.js             # Lightweight subscription and schedule store
│   ├── .env                    # Active local environment variables
│   └── .env.example            # Environment template
│
└── test/
    └── daymark.test.js         # Automated test suite (utilities, IndexedDB, picker, APIs)
```

---

## 3. Windows Development & Running Locally

### Prerequisites
* **Windows 10 or Windows 11**.
* **Visual Studio Code** (or any text editor).
* **Python 3** (recommended for static serving) OR **Node.js LTS** (version 18+).

### Option A: Running the Static Frontend via Python (Zero dependencies)
Open PowerShell or Command Prompt in the project root folder:

```powershell
# Start local HTTP server on port 8000
py -m http.server 8000
```

*(If `py` is not recognized, run `python -m http.server 8000`)*.

Open your browser at:
```text
http://localhost:8000
```

### Option B: Running with the Node.js Notification Backend
If you want to run the full Web Push server and scheduler locally:

```powershell
cd server
npm install
npm start
```

The server will start on `http://localhost:3001` and also serve the static frontend directly.

---

## 4. Running Automated Tests

DAYMARK includes an automated test suite verifying Utilities, IndexedDB operations, Task CRUD, Reminder CRUD, Wishlist CRUD, Random Picker selection logic, JSON Backup validation, and Backend APIs:

```powershell
NODE_PATH=./server/node_modules node --test test/daymark.test.js
```

---

## 5. iPhone Safari PWA Installation

To install DAYMARK on your iPhone:

1. Deploy the static application to an **HTTPS** URL (such as GitHub Pages or your hosting provider). *Web Push and Service Workers require HTTPS.*
2. Open Safari on your iPhone and visit your HTTPS URL.
3. Tap the **Share** button (the square with an arrow pointing upward at the bottom of Safari).
4. Scroll down and tap **Add to Home Screen**.
5. Confirm the application title **DAYMARK** and tap **Add** in the top right.
6. Return to your Home Screen and launch **DAYMARK**.
7. The application opens in standalone full-screen mode, respecting iOS safe-area top and bottom notch/home-indicator insets.
8. Go to **Settings** inside the app to enable notification permissions and test offline capability by toggling Airplane mode.

---

## 6. GitHub Pages Deployment

1. Initialize git and commit all files:
   ```bash
   git add .
   git commit -m "Initial DAYMARK release"
   ```
2. To push to GitHub, tap the **GitHub mark** at the top of the chat to connect your repository.
3. In your GitHub repository settings:
   - Navigate to **Settings** → **Pages**.
   - Under **Build and deployment**, select **Deploy from a branch**.
   - Under **Branch**, select `main` (or `master`) and folder `/(root)`.
   - Click **Save**.
4. GitHub Pages will generate your HTTPS live deployment URL (e.g. `https://<username>.github.io/<repo-name>/`).
5. Open that HTTPS URL on your iPhone Safari to install.

*Note: GitHub Pages provides static hosting for the full frontend, IndexedDB persistence, offline Service Worker caching, and in-app reminders. To receive background Web Push alerts when Safari is completely closed, deploy the `server/` folder to a free Node host (such as Render, Railway, or Fly.io).*

---

## 7. License

Built for personal productivity and organization. Free and open source.
