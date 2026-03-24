-- ============================================================
-- CareOps Phase 7 Analytics Queries
-- MySQL 8.x
-- ============================================================

USE careops_dw;

-- Optional analysis window controls.
-- Set to NULL to include full history.
SET @from_date = NULL;   -- e.g. '2022-01-01'
SET @to_date   = NULL;   -- e.g. '2023-12-31'

/*
Q1) Disease resource consumption trend
Goal: Identify diseases that consume the most hospital resources over time.
Metrics:
- total_cases
- total_bed_days
- total_treatment_spend (weighted from fact rows)
- 3-month moving average of spend per disease
*/
WITH monthly_disease AS (
    SELECT
        dd.year_num,
        dd.month_num,
        d.disease_name,
        SUM(ft.total_cases) AS total_cases,
        SUM(COALESCE(ft.total_bed_days, 0)) AS total_bed_days,
        SUM(COALESCE(ft.avg_treatment_cost, 0) * ft.total_cases) AS total_treatment_spend
    FROM Fact_Treatment ft
    JOIN Dim_Date dd
        ON dd.date_id = ft.date_id
    JOIN Dim_Disease d
        ON d.disease_sk = ft.disease_sk
    WHERE (@from_date IS NULL OR dd.full_date >= @from_date)
      AND (@to_date IS NULL OR dd.full_date <= @to_date)
    GROUP BY dd.year_num, dd.month_num, d.disease_name
)
SELECT
    year_num,
    month_num,
    disease_name,
    total_cases,
    total_bed_days,
    ROUND(total_treatment_spend, 2) AS total_treatment_spend,
    ROUND(
        AVG(total_treatment_spend) OVER (
            PARTITION BY disease_name
            ORDER BY year_num, month_num
            ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
        ),
        2
    ) AS spend_3m_moving_avg
FROM monthly_disease
ORDER BY year_num, month_num, total_treatment_spend DESC;


/*
Q2) Doctor recovery performance ranking
Goal: Rank doctors by outcomes while preventing small-sample bias.
Safeguard: only include doctors with at least 30 cases in selected period.
*/
WITH doctor_perf AS (
    SELECT
        doc.doctor_id,
        doc.specialization,
        doc.department,
        SUM(ft.total_cases) AS total_cases,
        SUM(ft.recovered_cases) AS recovered_cases,
        SUM(ft.readmitted_cases) AS readmitted_cases,
        SUM(COALESCE(ft.avg_treatment_cost, 0) * ft.total_cases) AS weighted_cost_sum,
        SUM(ft.total_cases) AS weighted_cost_den
    FROM Fact_Treatment ft
    JOIN Dim_Date dd
        ON dd.date_id = ft.date_id
    JOIN Dim_Doctor doc
        ON doc.doctor_sk = ft.doctor_sk
    WHERE (@from_date IS NULL OR dd.full_date >= @from_date)
      AND (@to_date IS NULL OR dd.full_date <= @to_date)
    GROUP BY doc.doctor_id, doc.specialization, doc.department
), scored AS (
    SELECT
        doctor_id,
        specialization,
        department,
        total_cases,
        recovered_cases,
        readmitted_cases,
        ROUND(100.0 * recovered_cases / NULLIF(total_cases, 0), 2) AS recovery_rate_pct,
        ROUND(100.0 * readmitted_cases / NULLIF(total_cases, 0), 2) AS readmission_rate_pct,
        ROUND(weighted_cost_sum / NULLIF(weighted_cost_den, 0), 2) AS weighted_avg_treatment_cost
    FROM doctor_perf
    WHERE total_cases >= 30
)
SELECT
    doctor_id,
    specialization,
    department,
    total_cases,
    recovered_cases,
    readmitted_cases,
    recovery_rate_pct,
    readmission_rate_pct,
    weighted_avg_treatment_cost,
    RANK() OVER (
        ORDER BY recovery_rate_pct DESC, readmission_rate_pct ASC, total_cases DESC
    ) AS performance_rank
FROM scored
ORDER BY performance_rank, doctor_id;


/*
Q3) Ward over-utilization analysis
Goal: Detect wards that are consistently over-utilized.
Method:
- Build ward-day occupancy proxy using MAX(total_bed_days) per ward/day
  to reduce double-counting at disease granularity.
- Compute monthly utilization_pct = occupied_bed_days / (capacity * days_in_month)
*/
WITH ward_day AS (
    SELECT
        dd.full_date,
        w.ward_id,
        w.ward_name,
        w.ward_type,
        w.capacity,
        MAX(COALESCE(ft.total_bed_days, 0)) AS occupied_bed_days
    FROM Fact_Treatment ft
    JOIN Dim_Date dd
        ON dd.date_id = ft.date_id
    JOIN Dim_Ward w
        ON w.ward_sk = ft.ward_sk
    WHERE ft.ward_sk IS NOT NULL
      AND (@from_date IS NULL OR dd.full_date >= @from_date)
      AND (@to_date IS NULL OR dd.full_date <= @to_date)
    GROUP BY dd.full_date, w.ward_id, w.ward_name, w.ward_type, w.capacity
), ward_month AS (
    SELECT
        YEAR(full_date) AS year_num,
        MONTH(full_date) AS month_num,
        ward_id,
        ward_name,
        ward_type,
        capacity,
        SUM(occupied_bed_days) AS month_occupied_bed_days,
        DAY(LAST_DAY(MAX(full_date))) AS days_in_month
    FROM ward_day
    GROUP BY YEAR(full_date), MONTH(full_date), ward_id, ward_name, ward_type, capacity
)
SELECT
    year_num,
    month_num,
    ward_id,
    ward_name,
    ward_type,
    capacity,
    month_occupied_bed_days,
    ROUND(100.0 * month_occupied_bed_days / NULLIF(capacity * days_in_month, 0), 2) AS utilization_pct,
    CASE
        WHEN 100.0 * month_occupied_bed_days / NULLIF(capacity * days_in_month, 0) >= 90 THEN 'Critical Over-Utilization'
        WHEN 100.0 * month_occupied_bed_days / NULLIF(capacity * days_in_month, 0) >= 75 THEN 'High Utilization'
        WHEN 100.0 * month_occupied_bed_days / NULLIF(capacity * days_in_month, 0) >= 50 THEN 'Moderate Utilization'
        ELSE 'Low Utilization'
    END AS utilization_band
FROM ward_month
ORDER BY year_num, month_num, utilization_pct DESC, ward_id;


/*
Q4) Treatment cost trend over time
Goal: Track monthly trend in average treatment cost and month-over-month change.
Metric:
- weighted average treatment cost by month
- MoM % change
*/
WITH monthly_cost AS (
    SELECT
        dd.year_num,
        dd.month_num,
        SUM(COALESCE(ft.avg_treatment_cost, 0) * ft.total_cases) AS weighted_cost_sum,
        SUM(ft.total_cases) AS total_cases
    FROM Fact_Treatment ft
    JOIN Dim_Date dd
        ON dd.date_id = ft.date_id
    WHERE (@from_date IS NULL OR dd.full_date >= @from_date)
      AND (@to_date IS NULL OR dd.full_date <= @to_date)
    GROUP BY dd.year_num, dd.month_num
), scored AS (
    SELECT
        year_num,
        month_num,
        ROUND(weighted_cost_sum / NULLIF(total_cases, 0), 2) AS avg_treatment_cost
    FROM monthly_cost
)
SELECT
    year_num,
    month_num,
    avg_treatment_cost,
    ROUND(
        100.0 * (
            avg_treatment_cost - LAG(avg_treatment_cost) OVER (ORDER BY year_num, month_num)
        ) / NULLIF(LAG(avg_treatment_cost) OVER (ORDER BY year_num, month_num), 0),
        2
    ) AS mom_change_pct
FROM scored
ORDER BY year_num, month_num;


/*
Q5) Readmission rate by disease
Goal: Identify diseases with persistently high readmission burden.
Output includes disease-level rates with reliability threshold.
*/
WITH disease_outcomes AS (
    SELECT
        d.disease_name,
        SUM(ft.total_cases) AS total_cases,
        SUM(ft.readmitted_cases) AS readmitted_cases,
        SUM(ft.recovered_cases) AS recovered_cases
    FROM Fact_Treatment ft
    JOIN Dim_Date dd
        ON dd.date_id = ft.date_id
    JOIN Dim_Disease d
        ON d.disease_sk = ft.disease_sk
    WHERE (@from_date IS NULL OR dd.full_date >= @from_date)
      AND (@to_date IS NULL OR dd.full_date <= @to_date)
    GROUP BY d.disease_name
)
SELECT
    disease_name,
    total_cases,
    readmitted_cases,
    recovered_cases,
    ROUND(100.0 * readmitted_cases / NULLIF(total_cases, 0), 2) AS readmission_rate_pct,
    ROUND(100.0 * recovered_cases / NULLIF(total_cases, 0), 2) AS recovery_rate_pct
FROM disease_outcomes
WHERE total_cases >= 25
ORDER BY readmission_rate_pct DESC, total_cases DESC, disease_name;
