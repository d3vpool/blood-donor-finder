# 🩸 LifeLink – Blood Donor Finder

LifeLink is a full-stack web application designed to connect blood donors with people in need.
It allows users to register as donors, search donors by blood group, and receive real-time
notifications for urgent blood requests using Firebase Cloud Messaging (FCM).

This project focuses on **real-world problem solving**, **clean architecture**, and
**production-ready practices**.

---

## ✨ Key Features

- 🔍 Search donors by blood group
- 👤 Donor registration and profile management
- 🔔 Real-time push notifications using Firebase Cloud Messaging (FCM)
- ⚡ Fast and responsive React frontend
- ☁️ Serverless backend with Firebase Cloud Functions
- 🔐 Secure handling of secrets and environment variables
- 🧹 Clean Git history with proper `.gitignore` practices

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

blood-donor-finder/

├── frontend/ # React application

│ ├── src/

│ ├── public/

│ └── package.json

├── backend/ # Firebase Cloud Functions

├── firebase.json # Firebase configuration

├── firestore.rules # Firestore security rules

├── .firebaserc # Firebase project config

└── README.md


## ⚙️ Local Setup

### 1️. Clone the repository
git clone https://github.com/d3vpool/blood-donor-finder.git
cd blood-donor-finder

### 2️. Frontend setup
cd frontend
npm install
npm start
The app will start on: http://localhost:3000

### 3️. Backend (Firebase Functions)
cd backend
npm install
firebase emulators:start
