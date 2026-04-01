# CareOps: Healthcare Operations and Treatment Analytics

CareOps is an end-to-end DBMS and data warehousing project that models hospital operations and delivers decision-oriented analytics.

The implementation covers:
- OLTP schema design (normalized transactional model)
- Advanced DBMS features (trigger, stored procedure, view)
- Data simulation for realistic workload generation
- Data warehouse design with dimensional modeling
- ETL pipeline from OLTP to DW
- Business analytics queries for management insights
- Optional web dashboard for visualization

## Business Questions Covered

1. Which diseases consume the highest healthcare resources over time?
2. Which doctors have the strongest recovery outcomes?
3. Which wards show sustained over-utilization risk?
4. How are treatment costs trending month-over-month?
5. Which diseases have the highest readmission burden?

## Current Project Status

| Phase | Deliverable | Status |
|---|---|---|
| 0 | Scope definition | Completed |
| 1 | Requirements specification | Completed |
| 2 | OLTP schema (MySQL) | Completed |
| 3 | Trigger, procedure, and view | Completed |
| 4 | OLTP data generation | Completed |
| 5 | Data warehouse schema and dimensions | Completed |
| 6 | ETL pipeline (Python) | Completed |
| 7 | Analytics SQL and report | Completed |
| 8 | Dashboard (React + Node API) | Implemented |

## Repository Layout

```text
DBMW_project/
├── phase0_scope_lock/
│   └── scope_lock.md
├── phase1_requirements/
│   └── requirements.md
├── phase2_oltp/
│   └── oltp_table.sql
├── phase3_adv/
│   ├── 3a_oltp_trigger.sql
│   ├── 3b_procedure.sql
│   ├── 3c_view.sql
│   └── phase3_all.sql
├── phase4_genData/
│   └── data.py
├── phase5_datawarehouse/
│   ├── createDW.sql
│   └── addData.py
├── phase6_etl/
│   ├── etl_code.py
│   └── etl.sql
├── phase7_analytics/
│   ├── analytics_queries.sql
│   └── PHASE7_ANALYTICS_REPORT.md
├── phase8_dashboard/
│   ├── src/
│   └── server/
├── run_demo.ps1
└── PROJECT_STATUS_REPORT.md
```

Note:
- `phase3_advanced_dbms`, `phase4_data_simulation`, and `phase5_data_warehouse` are legacy placeholder folders and are not used by the active pipeline.

## Technology Stack

| Layer | Technology |
|---|---|
| Database | MySQL 8.x |
| ETL and simulation | Python 3.10+ |
| Python connector | mysql-connector-python |
| Analytics | SQL (CTEs, window functions, ranking) |
| Dashboard | React + Vite + Express + mysql2 |

## Environment Configuration

Create a local `.env` file from the template:

```powershell
Copy-Item .env.example .env
```

Supported variables:

```text
CAREOPS_DB_HOST=localhost
CAREOPS_DB_PORT=3306
CAREOPS_DB_USER=root
CAREOPS_DB_PASSWORD=
CAREOPS_OLTP_DB=careops_oltp
CAREOPS_DW_DB=careops_dw
```

These variables are used by Phase 4, Phase 5, Phase 6, and `run_demo.ps1`.

## Prerequisites

1. MySQL 8.x installed and running.
2. Python 3.10+ available on PATH or in `.venv`.
3. Required Python package installed:

```bash
pip install mysql-connector-python faker
```

## Execution Guide

### Option A: One-command demo run (recommended for viva/demo)

```powershell
./run_demo.ps1
```

This executes Phases 2 through 6 sequentially.

### Option B: Step-by-step execution

1. Create OLTP schema:

```bash
mysql -u root -p < phase2_oltp/oltp_table.sql
```

2. Apply advanced DBMS objects:

```bash
mysql -u root -p careops_oltp < phase3_adv/phase3_all.sql
```

3. Generate OLTP data:

```bash
python phase4_genData/data.py
```

4. Create DW schema:

```bash
mysql -u root -p < phase5_datawarehouse/createDW.sql
```

5. Populate dimensions:

```bash
python phase5_datawarehouse/addData.py
```

6. Load fact table via ETL:

```bash
python phase6_etl/etl_code.py
```

7. Run analytics queries:

```bash
mysql -u root -p careops_dw < phase7_analytics/analytics_queries.sql
```

## Verification Queries

Run these checks after ETL to validate end-to-end loading:

```sql
SELECT COUNT(*) AS patient_count FROM careops_oltp.Patient;
SELECT COUNT(*) AS visit_count FROM careops_oltp.Visit;
SELECT COUNT(*) AS outcome_count FROM careops_oltp.Outcome;

SELECT COUNT(*) AS dim_date_count FROM careops_dw.Dim_Date;
SELECT COUNT(*) AS dim_disease_count FROM careops_dw.Dim_Disease;
SELECT COUNT(*) AS fact_treatment_count FROM careops_dw.Fact_Treatment;
```

## Submission Notes

1. Phase 7 deliverables are available in `phase7_analytics/analytics_queries.sql` and `phase7_analytics/PHASE7_ANALYTICS_REPORT.md`.
2. The dashboard is optional for core DBMS grading but available under `phase8_dashboard` for demonstration.
3. `phase6_etl/etl.sql` is intentionally kept as a reserved script; production ETL implementation is in `phase6_etl/etl_code.py`.
