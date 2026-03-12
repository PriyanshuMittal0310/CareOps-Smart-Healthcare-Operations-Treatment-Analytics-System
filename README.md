# CareOps — Smart Healthcare Operations & Treatment Analytics System

> **4th Semester DBMS + Data Warehousing Project**

A complete data systems project implementing an **OLTP database → ETL pipeline → Data Warehouse → Analytics** stack for a hospital domain. This is *not* a medical app — it is an analytics layer designed to answer five critical business questions about hospital operations.

---

## Business Questions Answered

| # | Question |
|---|----------|
| 1 | Which diseases consume the most hospital resources? |
| 2 | Which doctors achieve the best recovery outcomes? |
| 3 | Which wards are chronically over-utilized? |
| 4 | Are treatment costs increasing over time? |
| 5 | What is the hospital's patient readmission rate? |

---

## Project Structure

```
careops/
├── phase0_scope_lock/
│   └── scope_lock.md          # Stakeholders, business questions, scope boundary
├── phase1_requirements/
│   └── requirements.md        # Functional & non-functional requirements
├── phase2_oltp/
│   └── careops_oltp.sql       # 9-table 3NF schema + seed data (MySQL 8.x)
├── phase3_advanced_dbms/
│   └── advanced_features.sql  # Trigger, stored procedure, view
├── phase4_data_simulation/
│   └── generate_data.py       # Python script — 500 patients, 2000+ visits
├── phase5_data_warehouse/
│   └── careops_dw.sql         # Star schema DDL (surrogate keys)
├── phase6_etl/
│   └── etl_pipeline.py        # Extract → Transform → Load pipeline
├── phase7_analytics/
│   └── analytics_queries.sql  # 5 analytical SQL queries
└── .gitignore
```

---

## Implementation Status

| Phase | Title                  | Status |
|-------|------------------------|--------|
| 0     | Scope Lock             | ✅ Done |
| 1     | Requirement Analysis   | ✅ Done |
| 2     | OLTP Database Design   | ✅ Done |
| 3     | Advanced DBMS Features | ⬜ Pending |
| 4     | Data Simulation        | ⬜ Pending |
| 5     | Data Warehouse Design  | ⬜ Pending |
| 6     | ETL Pipeline           | ⬜ Pending |
| 7     | Analytics Queries      | ⬜ Pending |

---

## OLTP Schema (Phase 2)

9 entities in **Third Normal Form (3NF)**:

```
Patient ──┐
          ├── Visit ──── Diagnosis ── Disease
Doctor ───┘       └──── Treatment ── Medicine
                     └── Outcome

Ward ──── BedAllocation ── Patient
                └── AlertLog (populated by trigger)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| OLTP Database | MySQL 8.x |
| Data Warehouse | MySQL 8.x (separate schema) |
| Data Simulation / ETL | Python 3.x (`mysql-connector-python`, `Faker`) |
| Analytics | SQL — window functions, CTEs, GROUP BY ROLLUP |

---

## Quick Start

```bash
# 1. Clone
git clone <repo-url>
cd careops

# 2. Create OLTP database
mysql -u root -p < phase2_oltp/careops_oltp.sql

# 3. (After Phase 3 is done) Apply advanced features
mysql -u root -p careops_oltp < phase3_advanced_dbms/advanced_features.sql

# 4. (After Phase 4) Generate simulation data
pip install mysql-connector-python faker
python phase4_data_simulation/generate_data.py

# 5. (After Phase 5) Create data warehouse
mysql -u root -p < phase5_data_warehouse/careops_dw.sql

# 6. (After Phase 6) Run ETL
python phase6_etl/etl_pipeline.py

# 7. (After Phase 7) Run analytics queries
mysql -u root -p careops_dw < phase7_analytics/analytics_queries.sql
```
