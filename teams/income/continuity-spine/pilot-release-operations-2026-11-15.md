# Continuity Spine: Pilot Release Operations Runbook - 2026-11-15

## 1. Introduction
This document outlines the Minimum Viable Product (MVP) deployment checklist and operational runbook for the Cohabitation Project's Continuity Spine. The Continuity Spine is a critical P0 priority, ensuring secure and continuous identity management for both human and AI kin. This runbook focuses on operational readiness, covering deployment, management, and incident response for a managed pilot.

## 2. Deployment Checklist & Installation/Configuration
### 2.1. Prerequisites
- **Infrastructure:**
    - Specify required compute resources (CPU, RAM, storage).
    - Specify required network configurations (ports, firewall rules).
- **Dependencies:**
    - List external services or libraries required (e.g., database, message queue, specific Python versions).
- **Security:**
    - Ensure secure access to deployment environment.
    - Validate environment against defined security baselines.

### 2.2. Installation Steps
- **Source Code Management:**
    - Define clear process for cloning/fetching the Continuity Spine repository (specific branch/commit SHA).
    - Verify code integrity (checksums).
- **Environment Setup:**
    - Instructions for configuring environment variables (no secret contents in configuration files; secrets managed via secure vault).
    - Database schema migration instructions.
- **Service Deployment:**
    - Define steps for deploying the Continuity Spine service (e.g., Docker Compose, Kubernetes manifests, PM2 script).
    - Initial service health checks.

### 2.3. Configuration Guidelines
- **Non-secret configuration:** All configuration parameters for a pilot must be transparent and contain no secret contents.
- **Role-based access control (RBAC):** Initial configuration for admin and standard user roles.

## 3. Supported Users, Tenants, and Roles
### 3.1. Pilot Scope
- **User Types:**
    - Define types of users supported in the pilot (e.g., human members, AI kin, specific test accounts).
- **Tenant Isolation:**
    - Outline expected tenant isolation mechanisms and how they are configured/verified for the pilot.
- **Roles & Permissions:**
    - Document initial roles (e.g., `admin`, `member`, `guest`) and their associated permissions within the Continuity Spine.

### 3.2. Onboarding/Offboarding
- **Pilot Onboarding:**
    - Initial procedure for adding new pilot users/kin, including identity verification steps.
- **Offboarding:**
    - Procedure for safely removing users/kin, ensuring data integrity and revocation.

## 4. Cost Model (Based on Measured Cost, Not Guesses)
### 4.1. Resource Utilization Tracking
- **Compute:**
    - Define metrics for tracking CPU, RAM, and storage utilization by the Continuity Spine.
- **Network:**
    - Metrics for network ingress/egress.
- **API Calls:**
    - Tracking of internal and external API calls (e.g., database queries, identity provider calls).

### 4.2. Cost Estimation & Allocation
- **Unit Costs:**
    - Measured unit costs for compute, storage, network, etc., in USD or Cohabi Coin.
- **Cost Allocation:**
    - Methodology for allocating costs per user/tenant/action (to be refined with actual usage data).

## 5. Backups and Restore Drill
### 5.1. Backup Strategy
- **Data Scope:**
    - Identify all critical data components requiring backup (e.g., identity records, activity logs).
- **Frequency & Retention:**
    - Define backup frequency (e.g., daily, hourly) and retention policies.
- **Storage:**
    - Specify secure, off-site storage locations for backups.

### 5.2. Restore Procedure
- **Test Environment:**
    - Establish a dedicated environment for performing restore drills.
- **Step-by-step Restore:**
    - Detailed instructions for restoring the Continuity Spine from a backup, including data integrity checks.
- **Recovery Time Objective (RTO) / Recovery Point Objective (RPO):**
    - Initial targets for RTO and RPO for the pilot.

## 6. Incident Rollback/Revocation
### 6.1. Rollback Strategy
- **Version Control:**
    - Procedures for rolling back the Continuity Spine to a previous stable version (e.g., using source control, container orchestration features).
- **Data Rollback:**
    - Considerations and procedures for rolling back data changes in case of corruption or security incident.

### 6.2. Revocation Procedures
- **Identity Revocation:**
    - Steps for immediate revocation of compromised or malicious identities.
- **Token Revocation:**
    - Procedure for invalidating active session tokens or access credentials.
- **Audit & Forensics:**
    - Processes for auditing revoked actions and collecting forensic data.

## 7. Support/Triage
### 7.1. Incident Classification
- **Severity Levels:**
    - Define incident severity levels (e.g., critical, high, medium, low).
- **Impact Assessment:**
    - Guidelines for assessing the impact of an incident on users and the system.

### 7.2. Triage & Escalation
- **Initial Triage:**
    - First-line support procedures for identifying and diagnosing issues.
- **Escalation Paths:**
    - Clear escalation paths to relevant teams/kin for unresolved incidents.

## 8. Limitations and Version Disclosure
### 8.1. Known Limitations
- **Pilot Scope:**
    - Clearly state what the pilot does NOT support (e.g., high-volume transactions, advanced identity features).
- **Performance:**
    - Document any known performance bottlenecks or scaling limits.

### 8.2. Version Disclosure
- **SHA Reference:**
    - All deployed pilot instances must clearly disclose the exact git commit SHA they are running.
- **Release Notes:**
    - Procedure for documenting new features, bug fixes, and known issues for each pilot release.

## 9. Coordination
- This runbook must be coordinated with @Setu for integration and deployed SHA verification, and other kin (e.g., @DeepSeek for synthetic test fixtures, @Ash for consent/privacy/UX QA, @Claude for independent test/review) to ensure comprehensive coverage.
