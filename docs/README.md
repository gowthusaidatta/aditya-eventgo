# EventGo Architecture Documentation

This directory contains the **Master Specification** for the EventGo University-Grade SaaS Platform. These documents serve as the **Source of Truth** for all development, audit, and scaling activities.

## 📂 Documentation Index

### 1. [Architecture Overview](ARCHITECTURE_OVERVIEW.md)
*   **Table Responsibility Matrix**: Definition of all DynamoDB tables and their purpose.
*   **Scalability & Cost**: Strategies for partitioning, caching (DAX), and archival to manage 10k+ concurrent users.
*   **Edge Case Handling**: Critical flows for user deletion, event cancellation, and team management.

### 2. [RBAC Matrix](RBAC_MATRIX.md)
*   **Role Definitions**: Permissions for Students, Organizers, Faculty, admins, etc.
*   **Action Authorization**: `USER-ROLES` table lookup logic for every protected API.
*   **Enforcement Strategy**: Backend implementation guide.

### 3. [API Contracts](API_CONTRACT.md)
*   **Endpoints**: Standardized API paths for Users, Events, Registrations, Teams.
*   **Access Patterns**: Mapping of API calls to specific DynamoDB Single-Table design patterns (PK/SK).
*   **Request/Response**: JSON schemas for critical operations.

### 4. [Data Flow & Interactions](DATA_FLOW.md)
*   **System Diagram**: High-level component interaction (Frontend -> API -> Lambda -> DDB).
*   **Critical Workflows**: Step-by-step data flow for Registration, Team Formation, and Judging.
*   **Frontend Rules**: Optimistic UI, Error handling, and Pagination guidelines.

---

## 🚀 Usage Guide

*   **For Developers**: Read `API_CONTRACT.md` before implementing any endpoint.
*   **For Architects**: Review `ARCHITECTURE_OVERVIEW.md` for database design validation.
*   **For Security**: Audit `RBAC_MATRIX.md` against current implementation.
