# CareOps Phase 7 Analytics Report

Date: 2026-03-24  
Environment: MySQL 8.x (`careops_dw`)

This report summarizes insights from the production-ready analytics in `phase7_analytics/analytics_queries.sql`.

## 1) Objective

Provide decision-grade analytics for the five required business questions:

1. Disease resource consumption trend
2. Doctor recovery performance ranking
3. Ward over-utilization analysis
4. Treatment cost trend over time
5. Readmission rate by disease

## 2) Data Quality and Metric Design

- Query logic uses weighted cost metrics (`avg_treatment_cost * total_cases`) to avoid average-of-averages distortion.
- Rate metrics use `NULLIF` guards to avoid division-by-zero errors.
- Ranking and disease rates include minimum-volume filters to reduce small-sample bias.
- Ward utilization is computed using a ward-day consolidation (`MAX(total_bed_days)` per ward/day) before monthly aggregation to reduce fact-granularity inflation.

## 3) Key Findings (Current Run)

### Q1. Disease Resource Consumption Trend

Top month-disease spend events:

| Rank | Year-Month | Disease | Cases | Bed Days | Total Treatment Spend |
|---|---|---|---:|---:|---:|
| 1 | 2023-08 | Sepsis | 8 | 104 | 1,262,236.20 |
| 2 | 2022-12 | Viral Infection | 4 | 74 | 541,553.76 |
| 3 | 2023-08 | Hypertension | 15 | 146 | 489,961.64 |
| 4 | 2023-09 | Hip Osteoarthritis | 9 | 89 | 485,023.54 |
| 5 | 2023-07 | Acute Myocardial Infarction | 6 | 55 | 456,881.62 |

Interpretation:
- High-spend spikes are concentrated in a small set of disease-month combinations.
- Resource governance should prioritize high-cost disease pathways (not only high-volume diseases).

### Q2. Doctor Recovery Performance Ranking

Top performers (minimum 30 cases):

| Rank | Doctor ID | Specialization | Department | Cases | Recovery % | Readmission % |
|---|---:|---|---|---:|---:|---:|
| 1 | 49 | Endocrinologist | Endocrinology | 63 | 77.78 | 15.87 |
| 2 | 9 | Endocrinologist | Endocrinology | 77 | 71.43 | 7.79 |
| 3 | 15 | Dermatologist | Dermatology | 51 | 66.67 | 1.96 |
| 4 | 24 | Orthopedic Surgeon | Orthopedics | 37 | 64.86 | 8.11 |
| 5 | 30 | Nephrologist | Nephrology | 82 | 64.63 | 7.32 |

Interpretation:
- Recovery performance differs materially across clinicians and specialties.
- Best-practice review should focus on top-ranked clinicians and transfer protocols where applicable.

### Q3. Ward Over-Utilization Analysis

Highest observed monthly utilization:

| Rank | Year-Month | Ward | Type | Capacity | Occupied Bed Days | Utilization % |
|---|---|---|---|---:|---:|---:|
| 1 | 2023-08 | ICU | ICU | 10 | 247 | 79.68 |
| 2 | 2023-08 | Private Ward | Private | 10 | 236 | 76.13 |
| 3 | 2023-02 | Cardiac ICU | ICU | 8 | 168 | 75.00 |
| 4 | 2023-07 | Cardiac ICU | ICU | 8 | 186 | 75.00 |
| 5 | 2023-11 | Cardiac ICU | ICU | 8 | 177 | 73.75 |

Interpretation:
- ICU-class wards operate near high-utilization thresholds for multiple months.
- Capacity planning and surge-routing playbooks are justified for ICU and Cardiac ICU.

### Q4. Treatment Cost Trend Over Time

Recent monthly trend:

| Year-Month | Avg Treatment Cost | MoM Change % |
|---|---:|---:|
| 2023-12 | 13,876.77 | -5.96 |
| 2023-11 | 14,755.47 | -1.73 |
| 2023-10 | 15,015.36 | -1.14 |
| 2023-09 | 15,188.36 | -5.17 |
| 2023-08 | 16,016.91 | -13.39 |
| 2023-07 | 18,492.74 | +63.63 |

Interpretation:
- A major upward shock occurred in 2023-07, followed by multi-month normalization.
- Financial controls should investigate July drivers and preserve post-spike cost discipline.

### Q5. Readmission Rate by Disease

Highest readmission rates (minimum 25 cases):

| Rank | Disease | Cases | Readmitted | Readmission % | Recovery % |
|---|---|---:|---:|---:|---:|
| 1 | GI Bleeding | 126 | 23 | 18.25 | 48.41 |
| 2 | Urinary Tract Infection | 117 | 20 | 17.09 | 52.14 |
| 3 | Acute Pharyngitis | 113 | 19 | 16.81 | 55.75 |
| 4 | Kidney Stones | 100 | 16 | 16.00 | 56.00 |
| 5 | Epilepsy | 122 | 18 | 14.75 | 54.10 |

Interpretation:
- GI Bleeding and UTI show the highest readmission burden and should be priority targets for discharge-quality interventions.

## 4) Recommended Actions

1. Establish disease-specific readmission prevention bundles for top-risk conditions (GI Bleeding, UTI, Acute Pharyngitis).
2. Review ICU/Cardiac ICU capacity plans and escalation triggers for months with utilization above 75%.
3. Launch a cost-variance investigation focused on the 2023-07 spike drivers.
4. Build clinician peer-learning reviews from top-ranked recovery performers.
5. Add monthly KPI governance using these five queries as a fixed dashboard baseline.

## 5) Viva / Demo Guidance

For each query in demo:

1. Show the business question first.
2. Show one KPI table and one chart.
3. State one decision that can be taken from the result.

Suggested chart types:
- Q1: Line chart (monthly spend) with top diseases.
- Q2: Horizontal bar chart of recovery rate by doctor.
- Q3: Heatmap of ward utilization by month.
- Q4: Line chart for weighted avg treatment cost + MoM annotations.
- Q5: Ranked bar chart of readmission rate by disease.

## 6) Reproducibility

- Query source: `phase7_analytics/analytics_queries.sql`
- Run command:

```sql
USE careops_dw;
SOURCE C:/Users/mitta/OneDrive/Desktop/DBMW_project/phase7_analytics/analytics_queries.sql;
```
