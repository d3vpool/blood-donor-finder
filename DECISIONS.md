# 🏗️ Design & Architecture Decisions

## 2026-07-28 Decision: Serverless Backend Architecture with Firebase
- **Context**: Real-time blood requests and donor matching require immediate response to save lives. GeoFire was essential for location-based search to find nearby donors within critical timeframes. While Firestore/GeoFire have query limitations (as documented in Known Gotchas), we needed this capability to support the core emergency blood donation workflow where speed is critical.
- **Decision**: Use Firebase Cloud Functions with Firestore and GeoFire. We accept geospatial limitations and implement graceful degradation to city-level search for complex radius calculations, while using GeoFire for efficient donor searches within predefined zones.
- **Alternatives considered**:
  - AWS Lambda + RDS: Too slow for real-time emergency matching, requires complex infrastructure setup
  - Custom Node.js/Express with PostGIS: Higher maintenance burden, slower deployment time
  - No backend at all: Cannot support real-time notifications and user registration

## 2026-07-28 Decision: React + Tailwind for Frontend
- **Context**: LifeLink needs rapid UI iteration to support emergency blood request scenarios and real-time push notifications. When a blood emergency occurs, donors must act immediately - we need to ship UI updates quickly and ensure responsive notification flows. Also need to continuously improve the donation experience based on user feedback.
- **Decision**: Use React with Tailwind CSS for rapid development and real-time notification UI. Tailwind's utility-first approach allows quick styling of emergency request forms, notification banners, and real-time status updates. React's component model enables rapid iteration on critical donor interfaces without slowing down development.
- **Alternatives considered**:
  - Material-UI: Would require custom components for emergency urgency design and is slower to adapt to new blood request workflows
  - CSS Modules + SCSS: Too slow for rapid iteration during emergency workflow updates
  - No CSS framework: Wouldn't meet the emergency response visual design requirements for high-contrast, accessible notification interfaces
