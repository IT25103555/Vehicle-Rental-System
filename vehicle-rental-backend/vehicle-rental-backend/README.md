# Web-Based Vehicle Rental System — Backend API

Backend for **GroupY2-S1-MLB-B7G1-08** (SE2030 — Software Engineering, Y2S1 2026).
Node.js / Express / MongoDB (Mongoose). Built directly against your Proposal, Use Case
Documentation, and Activity Diagrams so every endpoint maps to a documented use case.

## Tech Stack
- Node.js + Express
- MongoDB + Mongoose
- JWT authentication, bcrypt password hashing (NFR: Security)
- Simulated payment gateway (per Proposal §Limitations: "payment feature can employ a dummy payment gateway")

## Setup

```bash
cd vehicle-rental-backend
npm install
cp .env.example .env      # then fill in MONGO_URI and JWT_SECRET
npm run seed               # creates an admin user + demo vehicle fleet
npm run dev                 # starts on http://localhost:5000
```

Default seeded admin login: `admin@rental.lk` / `Admin@123`

## Project Structure
```
config/db.js              MongoDB connection
models/                   User, Vehicle, Booking, Payment, Review, Maintenance
controllers/               Business logic, one file per use case group
routes/                     Express routers, one file per resource
middleware/auth.js         JWT protect + role-based restrictTo
middleware/errorHandler.js Centralised error responses
utils/                     generateToken, sendEmail, seed
server.js                   App entry point
```

## Use Case → API Mapping

| Use Case | Endpoints |
|---|---|
| UC-01 User Registration & Authentication | `POST /api/auth/register`, `POST /api/auth/login`, `GET/PUT /api/auth/me`, `PUT /api/auth/change-password`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password/:token`, `POST /api/auth/logout` |
| UC-02 Vehicle Search & Browsing | `GET /api/vehicles` (filters: category, brand, fuelType, transmission, minPrice, maxPrice, location, availableFrom/To, q), `GET /api/vehicles/:id` |
| UC-03 Vehicle Booking & Payment | `POST /api/bookings`, `GET /api/bookings/my`, `PUT /api/bookings/:id`, `PATCH /api/bookings/:id/cancel`, `POST /api/payments`, `GET /api/payments/my` |
| UC-04 AI Recommendation & Prediction | `GET /api/ai/recommendations`, `GET /api/ai/predict-demand`, `GET /api/ai/model-comparison` |
| UC-05 Booking & Customer Management | `GET /api/bookings` (admin), `PATCH /api/bookings/:id/approve`, `PATCH /api/bookings/:id/complete`, `GET /api/admin/users`, `PATCH /api/admin/users/:id/status` |
| UC-06 Vehicle Inventory & Reporting | `POST/PUT/PATCH/DELETE /api/vehicles/...` (admin), `GET /api/reports/dashboard`, `/bookings`, `/revenue`, `/vehicle-usage`, `/customer-activity` |

Minor functions also included: password reset, profile management, email notifications
(booking/payment confirmations — no-ops without SMTP config), booking history, reviews &
ratings (`POST /api/reviews`), and fleet maintenance tracking (`/api/admin/maintenance`).

## Auth
Send `Authorization: Bearer <token>` on protected routes. `role` is `customer` or `admin`;
admin-only routes are guarded with `restrictTo('admin')`.

## AI/ML Module (UC-04)
`aiController.js` ships a working **rule-based baseline** (content/popularity-based
recommendations, moving-average demand forecast) so the rest of the system is fully
demoable today. It's intentionally isolated behind three endpoints so that when your
team's trained models (per the proposal: comparing ≥2 ML algorithms on the assigned
dataset) are ready — in a Python/scikit-learn script or a small FastAPI service — you
only need to swap the internals of `getRecommendations`, `predictDemand`, and
`modelComparison`, not any other part of the app.

## Example Requests

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register -H "Content-Type: application/json" \
  -d '{"name":"Nimal Perera","email":"nimal@example.com","password":"pass123","phone":"0771234567","nic":"200012345678"}'

# Search vehicles
curl "http://localhost:5000/api/vehicles?category=Car&maxPrice=9000&availableFrom=2026-10-01&availableTo=2026-10-05"

# Create a booking (use token from login)
curl -X POST http://localhost:5000/api/bookings -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"vehicleId":"<VEHICLE_ID>","startDate":"2026-10-01","endDate":"2026-10-05"}'

# Pay (simulated - card ending in an even digit succeeds)
curl -X POST http://localhost:5000/api/payments -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"bookingId":"<BOOKING_ID>","cardNumber":"4111111111111112"}'
```

## Notes for the Report / Viva
- Field validation and duplicate-email/NIC checks implement UC-01's EX1/EX2/EX3 exactly as documented.
- Booking availability checks (date-overlap query) implement UC-03's business rule
  "A customer cannot book a vehicle that is already reserved or under maintenance."
- The payment simulator implements Proposal §Limitations #5 (simulated gateway) while still
  producing a realistic success/decline/retry flow for your demo and screenshots.
- `errorHandler.js` centralises the "no results found" / "not found" / validation-error
  responses referenced across UC-02, UC-05 and UC-06's Extensions tables.
