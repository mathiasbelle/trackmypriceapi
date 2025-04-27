# TrackMyPriceAPI

This is the backend of the **TrackMyPriceApp** application, a portfolio project that automatically tracks price changes of products from e-commerce websites and sends email notifications to users when a price change occurs.

## Features

-   Periodic price tracking using web scraping.
-   Sends email notifications when prices change.
-   Firebase Authentication integration.
-   CRUD operations for products.
-   Rate-limiting to prevent abuse.
-   Price tracking scheduler using cron jobs.

## Technologies Used

-   **NestJS** – Backend framework.
-   **PostgreSQL** – Relational database.
-   **Firebase Auth** – Authentication service.
-   **Playwright / Axios** – Web scraping tools.
-   **Node-cron** – Job scheduling for scraping.

## Frontend

The frontend for this project was built using **Next.js**. You can find it here:

[Frontend Repository](https://github.com/mathiasbelle/trackmypriceapp)

## Environment Variables

Create a `.env` file in the root of your project and configure the following variables:

```env
# CORS
CORS_ORIGIN=frontend-url
# Database
POSTGRES_USER=postgres_user
POSTGRES_PASSWORD=postgres_password
POSTGRES_DB=postgres_db
POSTGRES_PORT=5432
POSTGRES_HOST=postgres_host

# Firebase
FIREBASE_PROJECT_ID=your-firebase-project-id
...

# Email
SMTP_HOST=smtp.host...
SMTP_PORT=...
SMTP_SECURE=...
SMTP_USER=user
SMTP_PASSWORD=password
SMTP_FROM=...
```

## Installation

```bash
$ npm install
```

## Running locally

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod

# debug mode
$ npm run start:debug
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```
