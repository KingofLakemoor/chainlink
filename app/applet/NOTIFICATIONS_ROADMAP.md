# Event-Driven Notification System - Roadmap to Production

This document outlines the recommendations and future work required to harden the new event-driven notification architecture before it is pushed to production.

## 1. Testing & Validation
- **Integration Tests:** Write tests for `processSingleNotification` to ensure correct handling of `USER`, `ADMIN`, and `GLOBAL` audiences.
- **Transaction Conflict Testing:** Simulate high-concurrency environments to ensure the Firestore transaction mechanism correctly claims pending notifications without duplicate processing.
- **End-to-End Delivery:** Test the full flow from creating a pending notification document to the device receiving the push notification.

## 2. Scalability & Architecture
- **Dedicated Cloud Function/Microservice:** Move `startNotificationListener` out of the main Express server and into a dedicated worker service or Firebase Cloud Function (Firestore Trigger). This decouples notification processing from web traffic and prevents the listener from restarting during web server deployments.
- **Batching & Rate Limiting:** Enhance the global notification delivery mechanism to support cursors or pagination. Currently, pulling all users with FCM tokens into memory for a `GLOBAL` notification could cause memory issues at a massive scale.

## 3. Reliability & Observability
- **Dead Letter Queue (DLQ):** Implement a DLQ or retry mechanism for notifications that fail during processing (e.g., status changes to `FAILED`).
- **Monitoring:** Add explicit logging and monitoring around the Firestore `onSnapshot` listener to alert the team if the listener drops or crashes.
- **Token Cleanup Optimization:** Ensure that invalid FCM tokens are pruned efficiently without overwhelming the database with updates.

## 4. Security
- **Firestore Rules:** Ensure that `firestore.rules` strictly prohibits standard users from writing arbitrary documents to the `notifications` collection. Only the backend server/admin should have write access to trigger notifications.
