# ♻️ Kabadiwala — Consumer Scrap Pickup Web Application

**Kabadiwala** is a modern, production-ready consumer web application designed for selling household and commercial scrap (newspaper, cardboard, plastics, iron, aluminium, copper, brass, e-waste) at fair, verified market rates with doorstep pickup from active nearby scrap dealers (Kabadidealers).

---

## 🏗️ Architecture & Isolation

```
+-------------------------------------------------------------------+
|                   KABADIWALA CONSUMER FRONTEND                    |
|        React 18 + Vite + TypeScript + Tailwind CSS + Lucide        |
|        React Router + Axios + Socket.IO Client + Leaflet Maps     |
+-------------------------------------------------------------------+
                                  │
                 REST APIs & Real-time Socket.IO Events
                                  │
                                  ▼
+-------------------------------------------------------------------+
|                    KABADIWALA CONSUMER BACKEND                    |
|        Node.js + Express + TypeScript + Socket.IO + JWT           |
|        Mongoose Models + Strict State Machine + Geo-Discovery     |
+-------------------------------------------------------------------+
                                  │
                  Authenticated Webhook & Event Ingestion
                  (POST /api/internal/dealer-events/*)
                                  │
                                  ▼
+-------------------------------------------------------------------+
|               SEPARATELY DEPLOYED KABADIDEALER SYSTEM             |
+-------------------------------------------------------------------+
```

- **Clean Decoupling**: The consumer frontend communicates exclusively with the Kabadiwala Backend.
- **Cross-Application API Contract**: A separately deployed `Kabadidealer` backend sends status changes, live driver GPS coordinates, and OTP verification results via secure internal webhook endpoints (`/api/internal/dealer-events/*`) authenticated with `x-dealer-api-key`.
- **Zero-Config Portability**: Automatic in-memory MongoDB fallback with embedded mock dealer seed database ensures instant out-of-the-box local operation.

---

## 📦 Project Structure

```
kabadiwala/
├── backend/
│   ├── src/
│   │   ├── config/              # Environment & DB config
│   │   ├── controllers/         # Express controllers (Auth, User, Dealer, Order, Rating)
│   │   ├── middleware/          # JWT auth, validation (Zod), error handlers
│   │   ├── models/              # Mongoose models (User, Order, Rating, DealerSnapshot)
│   │   ├── routes/              # Express route definitions
│   │   ├── services/            # Business logic & state machine
│   │   ├── sockets/             # Socket.IO server & event broadcasters
│   │   ├── tests/               # Backend integration test suite
│   │   ├── types/               # TypeScript interfaces & types
│   │   ├── utils/               # Geo (Haversine), OTP, JWT, Seed data
│   │   ├── app.ts               # Express application
│   │   └── server.ts            # Server bootstrap
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── common/          # Modal, Toast, Badge, Logout dialog
    │   │   ├── dealer/          # DealerCard, DealerDetailsModal
    │   │   ├── layout/          # AppHeader, BottomNav
    │   │   ├── map/             # LiveTrackingMap, LocationPickerMap
    │   │   ├── order/           # MaterialSelector, OrderStatusBadge, OtpDisplayCard
    │   │   └── simulator/       # DealerSimulatorDrawer (Dev testing widget)
    │   ├── context/             # AuthContext, OrderContext
    │   ├── pages/               # 17 consumer screens
    │   ├── services/            # Axios API client, SocketService, MapService
    │   ├── types/               # Shared frontend interfaces
    │   ├── App.tsx              # Router configuration
    │   ├── main.tsx             # React DOM entry
    │   └── index.css            # Tailwind base & custom map styles
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.ts
```

---

## ⚙️ Environment Variables

### Backend (`kabadiwala/backend/.env`)
| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Backend API port |
| `NODE_ENV` | `development` | Environment mode |
| `CLIENT_APP_URL` | `http://localhost:5173` | Allowed frontend origin |
| `JWT_SECRET` | `...` | Secret key for JWT access tokens |
| `JWT_REFRESH_SECRET` | `...` | Secret key for refresh tokens |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/kabadiwala_consumer` | MongoDB connection URI |
| `USE_MEMORY_DB` | `true` | Set `true` to use instant in-memory MongoDB |
| `DEALER_SERVICE_API_KEY` | `kbad_shared_internal_secret_key_9988` | Key for dealer webhook auth |
| `OTP_DEMO_CODE` | `1234` | Predictable OTP for fast developer testing |

### Frontend (`kabadiwala/frontend/.env`)
| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:5000/api` | Backend REST endpoint |
| `VITE_SOCKET_URL` | `http://localhost:5000` | Backend Socket.IO URL |

---

## 🚀 Getting Started

### 1. Start the Backend Server
```bash
cd kabadiwala/backend
npm install
npm run dev
```
Backend starts on `http://localhost:5000`.

### 2. Start the Frontend App
```bash
cd kabadiwala/frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`.

### 3. Run Backend Integration Tests
```bash
cd kabadiwala/backend
npm test
```

---

## 🔄 Strict Order State Machine

```
   [PENDING] ──────────────────────┐
       │ (Dealer Accepts)          │ (Dealer Rejects / User Cancels)
       ▼                           ▼
  [ACCEPTED]                 [CANCELLED / REJECTED]
       │ (Starts Trip)
       ▼
[DEALER_EN_ROUTE] ── (Live GPS Updates: dealer:location)
       │ (Arrives at Doorstep)
       ▼
   [ARRIVED]
       │ (Consumer Shares 4-Digit OTP)
       ▼
 [OTP_VERIFIED]
       │ (Weighing on Digital Scale & Cash/UPI Settlement)
       ▼
  [COMPLETED] ── (Consumer Submits 1-5 Star Dealer Rating)
```

---

## 📡 Real-Time Socket.IO Events

| Event Name | Direction | Payload | Purpose |
|---|---|---|---|
| `join:order` | Client ➔ Server | `{ orderId }` | Joins order room for live tracking |
| `pickup:new` | Server ➔ Dealer | `{ orderId, pickupAddress, items, estAmount }` | Alerts nearby dealer of incoming order |
| `pickup:accepted` | Server ➔ Client | `{ orderId, status: 'ACCEPTED' }` | Notifies user that dealer accepted |
| `pickup:status` | Server ➔ Client | `{ orderId, status, note }` | Broadcasts any order state transition |
| `dealer:location` | Server ➔ Client | `{ coordinates: [lng, lat], etaMinutes, heading }` | Real-time moving GPS marker on map |
| `pickup:otp_verified` | Server ➔ Client | `{ orderId, status: 'OTP_VERIFIED' }` | Verifies pickup at doorstep |
| `pickup:completed` | Server ➔ Client | `{ orderId, finalWeights, finalTotalAmount }` | Final receipt & payout confirmation |

---

## 📱 17 Included Screens

1. **Splash Screen**: Animated green brand mark with status loader.
2. **Login Screen**: Indian mobile (+91) input with validation and quick demo autofill.
3. **OTP Verification Screen**: 4-digit auto-advancing input with resend countdown timer.
4. **Location Selection Screen**: Interactive Leaflet map picker, GPS locate me, and saved address manager (Home/Work).
5. **Consumer Home Screen**: Location bar, scrap category pills, active nearby dealers list with live scrap rates per kg.
6. **Dealer Details Modal/Screen**: Comprehensive price catalogue, verified dealer badges, vehicle info.
7. **Booking Confirmation Screen**: Material selector checklist, estimated scrap weight steppers, live earnings calculator.
8. **Searching / Waiting Screen**: Pulsing radar wave animation with cancellation option.
9. **Dealer Accepted Screen**: Immediate confirmation banner with dealer details and ETA.
10. **Live Tracking Screen**: Real-time Leaflet map displaying moving scrap loader pin, route polyline, and distance remaining.
11. **OTP Display Screen**: "Your pickup OTP: 4827" with safety instructions for doorstep verification.
12. **Pickup Verified Screen**: Certified electronic scale weighing in progress badge.
13. **Pickup Completed Screen**: Digital receipt breakdown, scrap weights, and total cash/UPI earnings.
14. **Rating Screen**: 1-5 star interactive rating, feedback tags (On Time, Accurate Weighing, Polite), and comment box.
15. **Order History Screen**: Chronological list of previous scrap pickups with receipts and status.
16. **Profile / Settings Screen**: Manage phone, name, and saved addresses.
17. **Logout Modal**: Confirmation dialog for session logout.
