# Phase 0 — Scope Lock
## CareOps: Smart Healthcare Operations & Treatment Analytics System

> **Rule #1:** Scope creep kills undergraduate projects. This document is locked.
> Do NOT add features beyond what is defined here.

---

## 2.1 Stakeholders

| Stakeholder              | Interest                                      |
|--------------------------|-----------------------------------------------|
| Hospital Administrator   | Resource allocation, ward occupancy, cost     |
| Medical Superintendent   | Doctor performance, treatment outcomes        |
| Operations Manager       | Bed utilization, patient throughput           |

---

## 2.2 Business Questions the System Must Answer

These five questions are the **sole justification** for the data warehouse.

| # | Business Question |
|---|-------------------|
| 1 | Which diseases consume the most hospital resources? |
| 2 | Which doctors achieve the best recovery outcomes? |
| 3 | Which wards are chronically over-utilized? |
| 4 | Are treatment costs increasing over time? |
| 5 | What is the hospital's patient readmission rate? |

---

## 2.3 In Scope vs. Out of Scope

| ✅ IN SCOPE                              | ❌ OUT OF SCOPE                         |
|-----------------------------------------|-----------------------------------------|
| OLTP relational database (3NF)          | Appointment booking UI or mobile app   |
| Data warehouse (star schema)            | Real patient data or PHI               |
| ETL pipeline (Extract-Transform-Load)   | Machine learning / diagnosis AI        |
| Analytics queries (SQL)                 | IoT sensors or real-time streaming     |
| Triggers & stored procedures            | Authentication / role-based access     |
| Simulated data (500+ patients)          | Cloud deployment                       |

---

## 2.4 Examiner Answer (Memorize This)

**Q: "Where is the UI?"**

> "The deliverable is the analytics layer, which feeds any front-end.
> Business intelligence tools like Tableau or Power BI would sit on top of
> this warehouse."

**Q: "Why did you build a data warehouse?"**

> "Our queries span multiple entities, require time-based aggregation, and
> would degrade OLTP performance under analytical load — all three classical
> conditions that justify a separate data warehouse."

---

## 2.5 Deliverables Checklist

- [ ] Phase 0 — Scope Lock (this document)
- [ ] Phase 1 — Requirement Analysis
- [ ] Phase 2 — OLTP Database Design (DDL + ER diagram)
- [ ] Phase 3 — Advanced DBMS Features (triggers, stored procedures, views)
- [ ] Phase 4 — Data Simulation (Python script, 500+ patients / 2000+ visits)
- [ ] Phase 5 — Data Warehouse Design (star schema DDL)
- [ ] Phase 6 — ETL Pipeline
- [ ] Phase 7 — Analytics Queries (5 queries)
