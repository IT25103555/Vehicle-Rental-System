# DriveLanka: Vehicle Rental System (AI Recommendation and Prediction Module)

Group project for **SE2030 – Software Engineering** (BSc (Hons) in IT, SLIIT, Year 2 Semester 1, 2026). DriveLanka is a web-based vehicle rental system built with a Java Spring Boot backend. It was built by a 6-member group, and each member owned one function of the system and one design pattern.

**My part (Ishki M A): AI Recommendation and Prediction.** This repository holds my work on that module. It uses the Strategy design pattern for price prediction.

## What the AI module does

| Feature | How it works |
|---|---|
| Vehicle recommendations | Scores vehicles for a customer using booking history, ratings and popularity, then returns the best matches |
| Demand prediction | Forecasts next month's bookings (overall or per vehicle type) using a 3-month moving average |
| Price estimation | Estimates the total rental cost from the vehicle, number of days and past completed bookings |
| Booking patterns | Most popular vehicle type, busiest month, busiest weekday and cancellation rate |
| Model comparison | Compares the pricing algorithms by Mean Absolute Error (MAE) on completed bookings |

These features are exposed as REST endpoints in `AiController` and used by the booking page and the admin "AI Insights" tab.

## Why the module is rule-based and not a trained model

I first built the module as a real machine learning model. It did not work out in practice:

- **The model kept growing.** Each time I trained it, the saved model and its files got bigger, until the folder reached about **1 GB**. That is too large to keep in a Git repository or to ship with a student project.
- **My laptop could not cope.** Training and loading the model at that size made my laptop crash.
- **A different approach was recommended.** I discussed this with my instructor, who recommended a **rule-based approach** for this project.

I switched to rule-based scoring and statistical methods. The final module is lightweight, runs instantly with no training step, and is easy to explain, because every recommendation comes from a visible scoring rule. The early ML work is kept in the repository as the first prototype and is **not** used by the final system.

**Trade-offs I accept:** the weights are set by hand and do not learn from data, and the forecasts are simple. A future version could use a smaller ML model (for example regression or collaborative filtering on a compact feature set) trained offline, with only a small model file loaded by the application.

## Strategy design pattern: price prediction

The pricing algorithms are interchangeable classes behind one interface, so a new algorithm is one new class and one extra list entry.

| Class | Role |
|---|---|
| `PricePredictionStrategy` | Strategy interface: `predictTotal(vehicle, days, history)` |
| `VehicleRateStrategy` | Listed daily rate × days |
| `CategoryAverageStrategy` | Category average rate × days |
| `HistoryCalibratedStrategy` | Rate × days × a calibration factor from past bookings (used by the booking-page estimate) |
| `PricePredictor` | Context: holds a strategy, `setStrategy()` swaps it at runtime, `predict()` delegates |

The model-comparison endpoint loops over the strategies, swaps each into `PricePredictor`, and measures its MAE against completed bookings. Requests with invalid input are rejected with an HTTP 400 response.

## Repository layout

```
├── AI_Recommendation/                    AI recommendation work
├── ai-service/                           early AI service prototype (not used in the final system)
├── vehicle-rental-backend/               Spring Boot backend
├── admin.html, Frondend.html             admin and customer web pages
└── Backend_Code_Ownership.pdf            who owns which backend code
```

## Tech

Java, Spring Boot, REST APIs, SQL (H2), HTML/CSS/JavaScript, Git/GitHub.

## How to run

1. Open the backend project in an IDE such as IntelliJ IDEA.
2. Run the Spring Boot application class.
3. Open `http://localhost:8080` in a browser.

## Limitations

- The recommendations and forecasts come from hand-set rules and simple statistics, not a trained model.
- The booking data used for demonstration is seeded sample data, so the MAE values are only illustrative.
- Payments are simulated and no real transactions occur.
