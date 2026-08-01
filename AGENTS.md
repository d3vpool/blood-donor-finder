# Before starting any task, read PROGRESS.md and run `git log --oneline -10` to see recent work.

# Commit messages: keep them to ONE short line that summarizes the whole change (no multi-line bodies).

# 🔥 LifeLink – Blood Donor Finder

LifeLink is a full-stack web application designed to connect blood donors with people in need. It allows users to register as donors, search donors by blood group, and receive real-time notifications for urgent blood requests using Firebase Cloud Messaging (FCM). This project focuses on real-world problem solving, clean architecture, and production-ready practices.

## 🛠 Tech Stack & Architecture

### Frontend
- **React (Create React App)** – Component-based architecture for responsive UI
- **JavaScript (ES6+)** – Modern vanilla JavaScript with no transpilation
- **Firebase Cloud Messaging** – Real-time push notification system
- **Tailwind CSS** – Utility-first CSS framework for rapid UI development
- **React Router** – Client-side routing for SPAs

### Backend
- **Firebase Cloud Functions** – Serverless architecture with automatic scaling
- **Firestore (NoSQL Database)** – Document database with real-time sync
- **GeoFire** – Geospatial indexing for location-based searches

### Dev & Tooling
- **Firebase Hosting** – Cloud deployment and CDN
- **Git & GitHub** – Version control and collaboration
- **Node.js** – Runtime environment

## 📁 Project Structure
```
blood-donor-finder/
├── frontend/                    # React application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/             # Page components
│   │   ├── hooks/             # Custom React hooks
│   │   └── services/          # API integration services
│   ├── public/                 # Static assets
│   └── package.json
├── functions/                   # Firebase Cloud Functions
├── backend/                     # Legacy backend (deprecated)
├── scripts/                     # Development scripts
├── database.rules.json         # Realtime Database security rules
├── firebase.json               # Firebase configuration
├── firestore.rules             # Firestore security rules
└── .firebaserc                 # Firebase project config
```

## 🎯 Coding Conventions

### Naming
- **Variables**: camelCase (e.g., `userProfile`, `bloodGroupQuery`) when using functions
- **Components**: PascalCase (e.g., `DonorSearch`, `RequestForm`)
- **Files**: kebab-case for folders, PascalCase for components
- **Firebase functions**: verb_noun format (e.g., `getDonorProfile`, `searchDonors`)

### Architecture
- **Separation of concerns**: UI, business logic, and data layers clearly separated
- **Functional components**: React uses functional components with hooks
- **Immutable updates**: Favor immutable state updates in React
- **Async/await**: Use async/await for all async operations
- **Error handling**: try/catch blocks for async operations, custom error objects for business logic errors

### Error Handling
- **Frontend errors**: Try/catch with user-friendly error messages via toast notifications
- **Backend errors**: Standardized error responses with status codes
- **Firebase errors**: Catch and transform to application-specific errors
- **Geospatial errors**: Catch and gracefully degrade to city-level search

### Testing
- **Frontend**: Jest with React Testing Library for unit and integration tests
- **Backend**: Not explicitly tested due to serverless nature (rely on integration testing)
- **E2E tests**: No explicit E2E framework used
- **Error scenarios**: Tests for network failures, invalid inputs, and edge cases

## ⚠️ Known Gotchas / Things Not to Do

1. **Geospatial limitations**: Firestore has limitations with complex geo-queries; avoid complex radius calculations
2. **Real-time sync**: Firestore real-time listeners can cause performance issues with large datasets
3. **Firebase limits**: Be mindful of Firestore limits (collection size, read/write operations)
4. **CORS setup**: Ensure frontend and backend domains are properly configured for cross-origin requests
5. **Staging vs production**: Use different Firebase projects for testing to avoid cost issues
6. **Firebase emulators**: Don't use emulators in production; they're development-only tools
7. **Secret management**: Never commit service account keys or API keys
8. **Browser compatibility**: Use feature detection, not browser detection
9. **RTDB Security Rules Race Condition**: When subscribing to newly created RTDB nodes simultaneously with client/server bootstrap, include `newData` fallbacks in `.read` rules so the creator/listener is authorized even before initial node data exists

## 🧹 Linting & Formatting

### Linting
- **Frontend**: Uses ESLint with React App configuration (extends: "react-app", "react-app/jest")
  - Scripts: `npm test` (includes linting via test setup)
  - Available in: `frontend/package.json`
- **Backend**: Uses ESLint with Google Style Guide (extends: "eslint-config-google")
  - Scripts: `npm run lint` (runs `eslint .`)
  - Available in: `functions/package.json`

### Formatting
- **No explicit formatter**: Tailwind CSS handles styling, code style enforced via ESLint rules
- **Code style**: Google Style Guide consistent across the project

## 🔄 Development Workflow

1. Run `git log --oneline -10` to see recent work
2. Check PROGRESS.md for current state and ongoing work
3. Run `firebase emulators:start` in functions/ for local development
4. Run `npm start` in frontend/ for frontend development
5. Commit changes with descriptive messages that tell the project story
6. Use feature branches for all new work
