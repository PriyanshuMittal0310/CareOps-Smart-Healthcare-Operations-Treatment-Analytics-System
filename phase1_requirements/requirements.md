# Phase 1 — Requirement Analysis
## CareOps: Smart Healthcare Operations & Treatment Analytics System

---

## 3.1 Functional Requirements

| # | Requirement |
|---|-------------|
| FR-01 | The system shall store **patient demographic data** (anonymized — no PII). |
| FR-02 | The system shall record each **patient visit**, including assigned doctor and date. |
| FR-03 | The system shall store **diagnoses** with ICD-like disease codes and severity levels. |
| FR-04 | The system shall track **treatments** (medicines, dosage, duration). |
| FR-05 | The system shall manage **ward and bed allocation**. |
| FR-06 | The system shall record **treatment outcomes** (Recovered / Improved / Readmitted). |
| FR-07 | The **data warehouse** shall support aggregated queries over time dimensions. |
| FR-08 | The **ETL pipeline** shall run periodically to refresh warehouse data from OLTP. |

---

## 3.2 Non-Functional Requirements

| Category       | Requirement |
|----------------|-------------|
| **Normalization** | All OLTP tables must conform to **Third Normal Form (3NF)**. |
| **Scalability**   | System must be tested with **500+ patients** and **2000+ visits**. |
| **Integrity**     | **Referential integrity** enforced via foreign keys across all relations. |
| **Auditability**  | **Triggers** must automatically log anomalies (e.g., unusually long stays). |

---

## 3.3 Entity Identification (derived from requirements)

| Entity        | Primary Key               | Derived From |
|---------------|---------------------------|--------------|
| Patient       | `patient_id`              | FR-01        |
| Doctor        | `doctor_id`               | FR-02        |
| Disease       | `disease_code`            | FR-03        |
| Medicine      | `medicine_id`             | FR-04        |
| Visit         | `visit_id`                | FR-02        |
| Diagnosis     | (`visit_id`, `disease_code`) | FR-03     |
| Treatment     | `treatment_id`            | FR-04        |
| Ward          | `ward_id`                 | FR-05        |
| BedAllocation | `allocation_id`           | FR-05        |
| Outcome       | `outcome_id`              | FR-06        |

---

## 3.4 Data Volume Targets

| Entity         | Target Volume |
|----------------|---------------|
| Patients       | 500+          |
| Visits         | 2,000+        |
| Diagnoses      | 2,000+        |
| Treatments     | 3,000+        |
| Doctors        | 30+           |
| Diseases       | 20+           |
| Medicines      | 40+           |
| Wards          | 10+           |
| Bed Allocations| 2,000+        |
| Outcomes       | 2,000+        |

---

## 3.5 Analytics Requirements (feeds Phase 7)

| Query ID | Description | Required Data |
|----------|-------------|---------------|
| AQ-01 | Disease trend over time | Diagnosis, Visit (date), Disease |
| AQ-02 | Doctor efficiency ranking | Visit, Outcome, Doctor |
| AQ-03 | Ward utilization rate | BedAllocation, Ward, Date |
| AQ-04 | Cost analysis by disease | Treatment, Medicine (cost), Disease |
| AQ-05 | Readmission rate by disease | Outcome (Readmitted), Disease, Patient |

---

## 3.6 Technology Stack

| Component      | Technology           |
|----------------|----------------------|
| OLTP Database  | MySQL 8.x            |
| Data Warehouse | MySQL 8.x (separate schema) |
| ETL / Simulation | Python 3.x (Faker, mysql-connector-python) |
| Analytics      | SQL (complex joins, window functions) |
