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
DBMW_project/
├── phase0_scope_lock/
│   └── scope_lock.md          # Stakeholders, business questions, scope boundary
├── phase1_requirements/
│   └── requirements.md        # Functional & non-functional requirements
├── phase2_oltp/
│   └── oltp_table.sql         # 11-table OLTP schema (MySQL 8.x)
├── phase3_adv/
│   ├── 3a_oltp_trigger.sql    # Trigger
│   ├── 3b_procedure.sql       # Stored procedure
│   ├── 3c_view.sql            # View
│   └── phase3_all.sql         # Consolidated one-click Phase 3 script
├── phase4_genData/
│   └── data.py                # Data generator (500 patients, 2000 visits)
├── phase5_datawarehouse/
│   ├── createDW.sql           # Data warehouse schema
│   └── addData.py             # Dimension table load
├── phase6_etl/
│   ├── etl_code.py            # Python ETL pipeline (implemented)
│   └── etl.sql                # Reserved SQL ETL file (currently empty)
├── phase7_analytics/
│   └── (pending)
├── phase3_advanced_dbms/      # Empty legacy folder
├── phase4_data_simulation/    # Empty legacy folder
└── phase5_data_warehouse/     # Empty legacy folder
```

---

## Implementation Status

| Phase | Title                  | Status |
|-------|------------------------|--------|
| 0     | Scope Lock             | ✅ Done |
| 1     | Requirement Analysis   | ✅ Done |
| 2     | OLTP Database Design   | ✅ Done |
| 3     | Advanced DBMS Features | ✅ Done |
| 4     | Data Simulation        | ✅ Done |
| 5     | Data Warehouse Design  | ✅ Done |
| 6     | ETL Pipeline           | ✅ Done (Python ETL) |
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
cd DBMW_project

# 2. Create local environment file from template
copy .env.example .env

# 3. Edit .env with your MySQL credentials

# 4. Create OLTP database
mysql -u root -p < phase2_oltp/oltp_table.sql

# 5. Apply advanced features (one-click consolidated script)
mysql -u root -p < phase3_adv/phase3_all.sql

# 6. Generate simulation data
pip install mysql-connector-python faker
python phase4_genData/data.py

# 7. Create data warehouse
mysql -u root -p < phase5_datawarehouse/createDW.sql

# 8. Populate dimensions
python phase5_datawarehouse/addData.py

# 9. Run ETL
python phase6_etl/etl_code.py

# 10. (After Phase 7 is added) Run analytics queries
mysql -u root -p careops_dw < phase7_analytics/analytics_queries.sql
```

## One-Command Demo Runner (Windows PowerShell)

Run this from project root to execute Phases 2 through 6 in order:

```powershell
./run_demo.ps1
```

The runner reads `.env` automatically before executing steps.

## Environment Variables

The Python scripts in Phase 4, 5, and 6 now use these variables:

- `CAREOPS_DB_HOST` (default: `localhost`)
- `CAREOPS_DB_USER` (default: `root`)
- `CAREOPS_DB_PASSWORD` (default: empty)
- `CAREOPS_OLTP_DB` (default: `careops_oltp`)
- `CAREOPS_DW_DB` (default: `careops_dw`)

If variables are not set, defaults are used.

Scripts also auto-load variables from a root `.env` file when present.
