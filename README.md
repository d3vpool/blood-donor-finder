# 🩸 LifeLink – Blood Donor Finder

LifeLink is a full-stack web application designed to connect blood donors with people in need.
It allows users to register as donors, search donors by blood group, and receive real-time
notifications for urgent blood requests using Firebase Cloud Messaging (FCM).

This project focuses on **real-world problem solving**, **clean architecture**, and
**production-ready practices**.

---

## ✨ Key Features

- 🔍 Search donors by blood group and radius, with distance shown on every donor card
- 🎯 Send a blood request directly to a specific nearby donor
- 🤝 Race-safe request acceptance — exactly one donor wins; accepted donors can cancel and reopen the request
- 📍 Live donor GPS tracking on an embedded map with ETA and reciprocal contact info once a request is accepted
- 🔔 Real-time push notifications using Firebase Cloud Messaging (FCM) to both parties on accept/cancel
- 👤 Donor registration with availability and snooze controls
- 🔐 Persistent login sessions (survive page refreshes and PWA relaunches)
- ⚡ Fast and responsive React frontend
- ☁️ Serverless backend with Firebase Cloud Functions

---

## 🛠 Tech Stack

### Frontend
- React (Create React App)
- JavaScript (ES6+)
- Firebase Cloud Messaging

### Backend
- Firebase Cloud Functions
- Firestore (NoSQL Database)

### Dev & Tooling
- Firebase Hosting
- Git & GitHub
- Node.js

---

## 📁 Project Structure
```text
blood-donor-finder/
├── frontend/ # React application
│   ├── src/
│   ├── public/
│   └── package.json
├── functions/ # Firebase Cloud Functions
├── backend/ # Legacy backend (deprecated)
├── firebase.json # Firebase configuration
├── firestore.rules # Firestore security rules
├── database.rules.json # Realtime Database security rules
├── .firebaserc # Firebase project config
└── README.md
```

## ⚙️ Local Setup

### 1️. Clone the repository
```bash
git clone https://github.com/d3vpool/blood-donor-finder.git
cd blood-donor-finder
```
### 2️. Frontend setup
```bash
cd frontend
npm install
npm start
```
The app will start on:
```bash
http://localhost:3000
```
### 3️. Backend (Firebase Functions)
```bash
cd functions
npm install
firebase emulators:start
```
