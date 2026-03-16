# Full-Stack Playwright E2E Testing Framework

A production-style, full-scale end-to-end testing project built with **Playwright + TypeScript**, testing a real **React + Django** web application running in **Docker**.

This project is designed as a portfolio-ready demonstration of modern QA/SDET skills, covering everything from test architecture to CI/CD integration.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Why This Structure](#why-this-structure)
3. [Tech Stack](#tech-stack)
4. [Folder Structure](#folder-structure)
5. [The Demo Application](#the-demo-application)
6. [Docker Setup](#docker-setup)
7. [Installation & Quick Start](#installation--quick-start)
8. [Seeding Demo Data](#seeding-demo-data)
9. [Running Playwright Tests](#running-playwright-tests)
10. [Environment Variables](#environment-variables)
11. [Viewing Reports & Debugging](#viewing-reports--debugging)
12. [CI/CD Pipeline](#cicd-pipeline)
13. [Best Practices](#best-practices)
14. [Future Improvements](#future-improvements)
15. [Interview Guide](#interview-guide)

---

## Project Overview

This is a **complete E2E testing ecosystem** that includes:

- **A real full-stack web application** (React frontend + Django backend + PostgreSQL)
- **A professional Playwright test framework** with Page Object Model, custom fixtures, API helpers, and CI/CD
- **Docker Compose** setup so everything runs with a single command

The demo app is a **Product Management System** where:
- Admin users can create, edit, and delete products
- Regular users can view/search products and update their profile
- Authentication is token-based
- All UI actions are backed by real API calls

## Why This Structure

| Decision | Reason |
|----------|--------|
| **Monorepo with app + tests** | Keeps everything together for easy setup and CI/CD |
| **Page Object Model** | Separates locators from test logic, making tests maintainable |
| **Custom Fixtures** | Reduces duplication, handles auth state reuse |
| **API helpers for setup/cleanup** | Makes tests independent and faster than UI-only setup |
| **Docker Compose** | Ensures consistent environment across machines |
| **TypeScript everywhere** | Type safety catches errors early in both app and tests |
| **Separate test suites (smoke/regression)** | Enables smart CI strategies (fast checks on PRs, full runs on main) |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, React Router |
| Backend | Django 5, Django REST Framework, PostgreSQL |
| Testing | Playwright, TypeScript |
| Infrastructure | Docker, Docker Compose |
| CI/CD | GitHub Actions |

## Folder Structure

```
pw-e2e-fullstack/
├── README.md                          # This file
├── .gitignore                         # Git ignore rules
├── .env.example                       # Environment variable template
├── docker-compose.yml                 # Docker orchestration
│
├── frontend/                          # React frontend application
│   ├── Dockerfile                     # Frontend Docker build
│   ├── nginx.conf                     # Nginx config for production build
│   ├── package.json                   # Frontend dependencies
│   ├── tsconfig.json                  # TypeScript config
│   ├── vite.config.ts                 # Vite build config
│   ├── index.html                     # HTML entry point
│   └── src/
│       ├── main.tsx                   # React entry point
│       ├── App.tsx                    # Routes and app shell
│       ├── App.css                    # Global styles
│       ├── services/
│       │   └── api.ts                 # API client with auth token handling
│       ├── hooks/
│       │   └── useAuth.ts             # Authentication context and hook
│       ├── components/
│       │   ├── Navbar.tsx             # Navigation bar with role display
│       │   ├── ConfirmDialog.tsx      # Reusable confirm/cancel dialog
│       │   └── ProtectedRoute.tsx     # Route guard for authenticated pages
│       └── pages/
│           ├── LoginPage.tsx          # Login form
│           ├── ForgotPasswordPage.tsx # Password reset request
│           ├── DashboardPage.tsx      # Dashboard with stats
│           ├── ItemsPage.tsx          # Product list with search
│           ├── CreateItemPage.tsx     # New product form
│           ├── EditItemPage.tsx       # Edit product form
│           └── ProfilePage.tsx        # User profile page
│
├── backend/                           # Django backend API
│   ├── Dockerfile                     # Backend Docker build
│   ├── manage.py                      # Django management script
│   ├── requirements.txt               # Python dependencies
│   ├── pytest.ini                     # Python test config
│   ├── config/
│   │   ├── settings.py                # Django settings
│   │   ├── urls.py                    # Root URL config
│   │   └── wsgi.py                    # WSGI entry point
│   ├── users/
│   │   ├── models.py                  # Custom user model (email-based)
│   │   ├── serializers.py             # User data serializers
│   │   ├── views.py                   # Auth and profile endpoints
│   │   ├── urls.py                    # User URL routes
│   │   └── admin.py                   # Django admin registration
│   ├── items/
│   │   ├── models.py                  # Product/Item model
│   │   ├── serializers.py             # Item data serializers
│   │   ├── views.py                   # CRUD endpoints with permissions
│   │   ├── urls.py                    # Item URL routes
│   │   └── admin.py                   # Django admin registration
│   └── app/
│       └── management/
│           └── commands/
│               └── seed_data.py       # Seeds demo users and items
│
└── tests/
    └── playwright-e2e/                # Playwright test framework
        ├── package.json               # Test dependencies and scripts
        ├── tsconfig.json              # TypeScript config for tests
        ├── playwright.config.ts       # Playwright configuration
        ├── .env.example               # Test environment variables
        │
        ├── pages/                     # Page Object Model classes
        │   ├── BasePage.ts            # Shared page methods
        │   ├── LoginPage.ts           # Login page interactions
        │   ├── DashboardPage.ts       # Dashboard page interactions
        │   ├── ItemsPage.ts           # Items page interactions
        │   └── ProfilePage.ts         # Profile page interactions
        │
        ├── fixtures/                  # Custom Playwright fixtures
        │   ├── test.fixture.ts        # Extended test with page objects
        │   └── auth.fixture.ts        # Authentication state setup
        │
        ├── utils/                     # Utility modules
        │   ├── env.ts                 # Environment variable loader
        │   ├── logger.ts              # Simple test logger
        │   ├── testData.ts            # Test data helpers
        │   ├── apiClient.ts           # API client for setup/cleanup
        │   ├── randomData.ts          # Random data generators
        │   └── waitHelpers.ts         # Custom wait utilities
        │
        ├── test-data/                 # Static test data files
        │   ├── users.json             # Demo user credentials
        │   └── items.json             # Sample item data
        │
        ├── tests/                     # Test specifications
        │   ├── auth/                  # Authentication tests
        │   │   ├── login.spec.ts
        │   │   ├── invalid-login.spec.ts
        │   │   ├── logout.spec.ts
        │   │   └── forgot-password.spec.ts
        │   ├── dashboard/
        │   │   └── dashboard.spec.ts
        │   ├── items/                 # Product CRUD tests
        │   │   ├── create-item.spec.ts
        │   │   ├── edit-item.spec.ts
        │   │   ├── delete-item.spec.ts
        │   │   └── search-item.spec.ts
        │   ├── profile/
        │   │   └── update-profile.spec.ts
        │   ├── access/
        │   │   └── role-access.spec.ts
        │   ├── smoke/
        │   │   └── smoke.spec.ts
        │   ├── regression/
        │   │   └── regression.spec.ts
        │   └── api/
        │       └── item-api.spec.ts
        │
        └── .github/
            └── workflows/
                └── playwright.yml     # GitHub Actions CI/CD
```

## The Demo Application

### React Frontend

The frontend is a single-page application built with React and TypeScript:

- **Login Page**: Email and password form with validation error display
- **Dashboard**: Shows a welcome message with the user's name, item statistics, and quick navigation links
- **Items Page**: Displays all products in a table. Admin users see Create, Edit, and Delete buttons. All users can search/filter items by name
- **Create/Edit Item Pages**: Forms with fields for name, description, category, price, and optional file attachment
- **Profile Page**: View and update user name, with optional avatar upload
- **Forgot Password Page**: Mock password reset that shows a success message

Key frontend design choices for testability:
- All interactive elements have `data-testid` attributes
- Forms use semantic HTML with proper `<label>` elements
- Error and success messages use identifiable text
- The navbar displays the user's role (Admin/User)

### Django Backend

The backend provides a REST API using Django REST Framework:

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/users/login/` | POST | Login, returns auth token | No |
| `/api/users/logout/` | POST | Logout, deletes token | Yes |
| `/api/users/forgot-password/` | POST | Mock password reset | No |
| `/api/users/profile/` | GET | Get current user profile | Yes |
| `/api/users/profile/` | PUT | Update profile | Yes |
| `/api/items/` | GET | List items (supports `?search=`) | Yes |
| `/api/items/` | POST | Create item (admin only) | Yes |
| `/api/items/:id/` | GET | Get single item | Yes |
| `/api/items/:id/` | PUT | Update item (admin only) | Yes |
| `/api/items/:id/` | DELETE | Delete item (admin only) | Yes |

Authentication uses DRF Token Authentication. Login returns a token that must be included in subsequent requests as `Authorization: Token <token>`.

## Docker Setup

The project uses Docker Compose with three services:

| Service | Port | Description |
|---------|------|-------------|
| `db` | 5434 | PostgreSQL 15 database |
| `backend` | 8000 | Django API server |
| `frontend` | 3000 | Nginx serving React build |

The backend container automatically:
1. Runs database migrations
2. Seeds demo data (users and items)
3. Starts the Django development server

## Installation & Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Node.js](https://nodejs.org/) 18+ (for running Playwright tests)

### Step 1: Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd pw-e2e-fullstack

# Copy environment file
cp .env.example .env
```

### Step 2: Start the Application

```bash
# Build and start all services (database, backend, frontend)
docker compose up --build

# Wait until you see:
#   demo-backend  | Starting development server at http://0.0.0.0:8000/
#   demo-frontend | ... ready
```

### Step 3: Verify the App

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/
- Login with: `admin@example.com` / `Admin123!`

### Step 4: Install Playwright

```bash
cd tests/playwright-e2e

# Install Node.js dependencies
npm install

# Install Playwright browsers
npx playwright install --with-deps
```

### Step 5: Run Tests

```bash
# Run all tests
npm test

# Run tests in headed mode (see the browser)
npm run test:headed

# Run only smoke tests
npm run test:smoke
```

## Seeding Demo Data

Demo data is automatically seeded when the backend container starts. The seed command creates:

**Users:**
| Email | Password | Role |
|-------|----------|------|
| admin@example.com | Admin123! | Admin |
| user@example.com | User123! | User |

**Items:** 10 sample products across categories (Electronics, Clothing, Books, Home, Sports)

To manually re-seed data:
```bash
docker compose exec backend python manage.py seed_data
```

## Running Playwright Tests

All commands are run from the `tests/playwright-e2e/` directory.

```bash
# Run all tests across all browsers
npm test

# Run in headed mode (watch the browser)
npm run test:headed

# Run only on Chromium
npm run test:chromium

# Run smoke tests only
npm run test:smoke

# Run regression tests only
npm run test:regression

# Run API tests only
npm run test:api

# Run a specific test file
npx playwright test tests/auth/login.spec.ts

# Run tests matching a pattern
npx playwright test -g "admin can create"

# Run with debug mode (step through tests)
npx playwright test --debug

# Run with UI mode (interactive)
npx playwright test --ui
```

## Environment Variables

### Test Framework (.env in tests/playwright-e2e/)

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3000` | Frontend URL |
| `API_URL` | `http://localhost:8000` | Backend API URL |
| `ADMIN_EMAIL` | `admin@example.com` | Admin user email |
| `ADMIN_PASSWORD` | `Admin123!` | Admin user password |
| `USER_EMAIL` | `user@example.com` | Regular user email |
| `USER_PASSWORD` | `User123!` | Regular user password |

## Viewing Reports & Debugging

### HTML Report

After running tests, open the HTML report:
```bash
npx playwright show-report
```

### Traces

Traces are recorded on test failure. To view a trace:
```bash
npx playwright show-trace test-results/<test-name>/trace.zip
```

Or use the [Trace Viewer](https://trace.playwright.dev/) website — just drag and drop the trace.zip file.

### Screenshots and Videos

On test failure, Playwright automatically captures:
- **Screenshots**: Saved in `test-results/` directory
- **Videos**: Saved alongside screenshots (enabled for failed tests)
- **Traces**: Full execution trace with DOM snapshots, network requests, and console logs

These are configured in `playwright.config.ts`:
```typescript
use: {
  screenshot: 'only-on-failure',
  video: 'on-first-retry',
  trace: 'on-first-retry',
}
```

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/playwright.yml`) runs on every push and pull request:

1. **Starts the full-stack app** using Docker Compose
2. **Installs Playwright** and its browser dependencies
3. **Runs smoke tests on PRs** for fast feedback
4. **Runs full regression on main branch** for thorough coverage
5. **Uploads the HTML report** as a GitHub Actions artifact

To view CI test results:
1. Go to the Actions tab in your GitHub repo
2. Click on the workflow run
3. Download the `playwright-report` artifact
4. Extract and open `index.html`

## Best Practices

This project follows these testing best practices:

| Practice | How It's Applied |
|----------|-----------------|
| **Page Object Model** | All page interactions are encapsulated in page classes |
| **Test Independence** | Each test creates its own data and cleans up after itself |
| **API for Setup/Cleanup** | Tests use API calls to set up preconditions, not slow UI flows |
| **Storage State Reuse** | Auth state is saved and reused to avoid logging in for every test |
| **Stable Locators** | Tests use `getByRole`, `getByLabel`, `getByTestId` — not fragile CSS selectors |
| **No Hard-Coded Waits** | Uses Playwright auto-waiting and explicit `waitForResponse` where needed |
| **Parallel-Safe Design** | Tests use unique random data so they don't interfere with each other |
| **Meaningful Assertions** | Tests assert on visible user-facing content, not implementation details |
| **Tagged Test Suites** | Smoke and regression suites enable smart CI/CD strategies |
| **Environment Configs** | All URLs and credentials are configurable via environment variables |

## Future Improvements

- [ ] Add visual regression testing with Playwright screenshots comparison
- [ ] Add accessibility testing with @axe-core/playwright
- [ ] Add performance testing metrics collection
- [ ] Add database reset endpoint for complete test isolation
- [ ] Add email testing with Mailhog for forgot password flow
- [ ] Add multi-language/i18n testing
- [ ] Add mobile viewport testing
- [ ] Add Allure reporter integration
- [ ] Add test retry analytics
- [ ] Add Playwright component testing for React components

## Interview Guide

### How to Explain This Project

> "I built a complete end-to-end testing framework using Playwright and TypeScript. Instead of testing against a mock or external site, I created a real full-stack application with React and Django, running in Docker. This lets me demonstrate true E2E testing where the frontend calls a real API with a real database."

### Why These Technologies?

| Choice | Reasoning |
|--------|-----------|
| **Playwright** | Modern, fast, auto-waiting, multi-browser, built-in API testing, great DX |
| **TypeScript** | Type safety, better IDE support, catches bugs at compile time |
| **React** | Most popular frontend framework, realistic for real-world apps |
| **Django + DRF** | Mature, batteries-included, fast to build REST APIs |
| **Docker Compose** | Reproducible environment, one command to start everything |
| **Page Object Model** | Industry standard pattern for maintainable test code |
| **GitHub Actions** | Free CI/CD, widely used, easy artifact management |

### Key Design Decisions

1. **Custom Fixtures over beforeEach**: Fixtures compose better and provide automatic cleanup
2. **API setup + UI verification**: Tests set up data via fast API calls, then verify through the UI — best of both worlds
3. **Storage state for auth**: Saves login state to disk and reuses it, avoiding repeated login UI flows
4. **Separate smoke/regression suites**: PR checks run fast smoke tests; main branch runs full regression
5. **Random test data**: Each test generates unique data (random names, emails) so tests can run in parallel safely
6. **Environment-based config**: Same tests can run against local Docker, staging, or production with just env var changes

### Interview Talking Points

- "The framework uses the Page Object Model to separate test logic from page interactions. If the UI changes, I only update the page object, not every test."
- "I use API calls for test data setup and cleanup, which makes tests faster and more reliable than setting up everything through the UI."
- "Auth state is saved to disk and reused across tests using Playwright's storage state feature, which significantly speeds up test execution."
- "Tests are tagged with @smoke and @regression, so CI can run fast checks on PRs and full suites on merges."
- "Everything runs in Docker, so any team member can clone the repo and run the full test suite without manual environment setup."
- "The framework supports parallel execution — each test creates its own data with random values, so there are no conflicts."
