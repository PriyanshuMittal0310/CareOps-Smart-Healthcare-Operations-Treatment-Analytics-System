const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json());

const baseConfig = {
  host: process.env.MYSQL_HOST || "localhost",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "Thane@01",
};

const dwPool = mysql.createPool({
  ...baseConfig,
  database: process.env.MYSQL_DW_DATABASE || "careops_dw",
  connectionLimit: 8,
});

const oltpPool = mysql.createPool({
  ...baseConfig,
  database: process.env.MYSQL_OLTP_DATABASE || "careops_oltp",
  connectionLimit: 4,
});

function parseDateRange(query) {
  const from = query.from || "2022-01-01";
  const to = query.to || "2023-12-31";
  return [from, to];
}

app.get("/api/meta", async (_req, res) => {
  try {
    const [rows] = await dwPool.query(
      `SELECT MAX(dd.full_date) AS lastFactDate, COUNT(*) AS factRows
       FROM Fact_Treatment ft
       JOIN Dim_Date dd ON dd.date_id = ft.date_id`,
    );

    res.json(rows[0]);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to read metadata", error: error.message });
  }
});

app.get("/api/overview", async (req, res) => {
  try {
    const [from, to] = parseDateRange(req.query);
    const [rows] = await dwPool.query(
      `SELECT
          COALESCE(SUM(ft.total_cases), 0) AS totalCases,
          COALESCE(SUM(ft.recovered_cases), 0) AS recoveredCases,
          COALESCE(SUM(ft.readmitted_cases), 0) AS readmittedCases,
          ROUND(COALESCE(AVG(ft.avg_treatment_cost), 0), 2) AS avgTreatmentCost,
          COALESCE(SUM(ft.total_bed_days), 0) AS totalBedDays,
          ROUND((COALESCE(SUM(ft.recovered_cases), 0) / NULLIF(COALESCE(SUM(ft.total_cases), 0), 0)) * 100, 2) AS recoveryRatePct,
          ROUND((COALESCE(SUM(ft.readmitted_cases), 0) / NULLIF(COALESCE(SUM(ft.total_cases), 0), 0)) * 100, 2) AS readmissionRatePct
       FROM Fact_Treatment ft
       JOIN Dim_Date dd ON dd.date_id = ft.date_id
       WHERE dd.full_date BETWEEN ? AND ?`,
      [from, to],
    );

    res.json(rows[0]);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to load overview", error: error.message });
  }
});

app.get("/api/trend-monthly", async (req, res) => {
  try {
    const [from, to] = parseDateRange(req.query);
    const [rows] = await dwPool.query(
      `SELECT
          CONCAT(dd.year_num, '-', LPAD(dd.month_num, 2, '0')) AS monthLabel,
          SUM(ft.total_cases) AS totalCases,
          ROUND(AVG(ft.avg_treatment_cost), 2) AS avgCost,
          SUM(ft.readmitted_cases) AS readmittedCases
       FROM Fact_Treatment ft
       JOIN Dim_Date dd ON dd.date_id = ft.date_id
       WHERE dd.full_date BETWEEN ? AND ?
       GROUP BY dd.year_num, dd.month_num
       ORDER BY dd.year_num, dd.month_num`,
      [from, to],
    );

    res.json(rows);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to load monthly trend", error: error.message });
  }
});

app.get("/api/analytics-queries", async (req, res) => {
  try {
    const [from, to] = parseDateRange(req.query);
    const results = await Promise.all([
      dwPool.query(
        `WITH monthly_disease AS (
            SELECT
                dd.year_num AS yearNum,
                dd.month_num AS monthNum,
                d.disease_name AS diseaseName,
                SUM(ft.total_cases) AS totalCases,
                SUM(COALESCE(ft.total_bed_days, 0)) AS totalBedDays,
                SUM(COALESCE(ft.avg_treatment_cost, 0) * ft.total_cases) AS totalTreatmentSpend
            FROM Fact_Treatment ft
            JOIN Dim_Date dd
                ON dd.date_id = ft.date_id
            JOIN Dim_Disease d
                ON d.disease_sk = ft.disease_sk
            WHERE dd.full_date BETWEEN ? AND ?
          GROUP BY dd.year_num, dd.month_num, d.disease_name
        )
        SELECT
            yearNum,
            monthNum,
            diseaseName,
            totalCases,
            totalBedDays,
          ROUND(totalTreatmentSpend, 2) AS totalTreatmentSpend
        FROM monthly_disease
        ORDER BY yearNum, monthNum, totalTreatmentSpend DESC`,
        [from, to],
      ),
      dwPool.query(
        `WITH doctor_perf AS (
            SELECT
                doc.doctor_id AS doctorId,
                doc.specialization AS specialization,
                doc.department AS department,
                SUM(ft.total_cases) AS totalCases,
                SUM(ft.recovered_cases) AS recoveredCases,
                SUM(ft.readmitted_cases) AS readmittedCases,
                SUM(COALESCE(ft.avg_treatment_cost, 0) * ft.total_cases) AS weightedCostSum,
                SUM(ft.total_cases) AS weightedCostDen
            FROM Fact_Treatment ft
            JOIN Dim_Date dd
                ON dd.date_id = ft.date_id
            JOIN Dim_Doctor doc
                ON doc.doctor_sk = ft.doctor_sk
            WHERE dd.full_date BETWEEN ? AND ?
            GROUP BY doc.doctor_id, doc.specialization, doc.department
        ), scored AS (
            SELECT
                doctorId,
                specialization,
                department,
                totalCases,
                recoveredCases,
                readmittedCases,
                ROUND(100.0 * recoveredCases / NULLIF(totalCases, 0), 2) AS recoveryRatePct,
                ROUND(100.0 * readmittedCases / NULLIF(totalCases, 0), 2) AS readmissionRatePct,
                ROUND(weightedCostSum / NULLIF(weightedCostDen, 0), 2) AS weightedAvgTreatmentCost
            FROM doctor_perf
            WHERE totalCases >= 30
        )
        SELECT
            doctorId,
            specialization,
            department,
            totalCases,
            recoveredCases,
            readmittedCases,
            recoveryRatePct,
            readmissionRatePct,
            weightedAvgTreatmentCost,
            RANK() OVER (
                ORDER BY recoveryRatePct DESC, readmissionRatePct ASC, totalCases DESC
            ) AS performanceRank
        FROM scored
        ORDER BY performanceRank, doctorId`,
        [from, to],
      ),
      dwPool.query(
        `WITH doctor_monthly AS (
          SELECT
            doc.doctor_id AS doctorId,
            doc.specialization AS specialization,
            doc.department AS department,
            dd.year_num AS yearNum,
            dd.month_num AS monthNum,
            SUM(ft.total_cases) AS totalCases,
            SUM(ft.recovered_cases) AS recoveredCases,
            SUM(ft.readmitted_cases) AS readmittedCases
          FROM Fact_Treatment ft
          JOIN Dim_Date dd
            ON dd.date_id = ft.date_id
          JOIN Dim_Doctor doc
            ON doc.doctor_sk = ft.doctor_sk
          WHERE dd.full_date BETWEEN ? AND ?
          GROUP BY
            doc.doctor_id,
            doc.specialization,
            doc.department,
            dd.year_num,
            dd.month_num
        )
        SELECT
          doctorId,
          specialization,
          department,
          yearNum,
          monthNum,
          CONCAT(yearNum, '-', LPAD(monthNum, 2, '0')) AS monthLabel,
          totalCases,
          recoveredCases,
          readmittedCases,
          ROUND(100.0 * recoveredCases / NULLIF(totalCases, 0), 2) AS recoveryRatePct,
          ROUND(100.0 * readmittedCases / NULLIF(totalCases, 0), 2) AS readmissionRatePct
        FROM doctor_monthly
        WHERE totalCases > 0
        ORDER BY doctorId, yearNum, monthNum`,
        [from, to],
      ),
      dwPool.query(
        `WITH ward_day AS (
            SELECT
                dd.full_date AS fullDate,
                w.ward_id AS wardId,
                w.ward_name AS wardName,
                w.ward_type AS wardType,
                w.capacity AS capacity,
                MAX(COALESCE(ft.total_bed_days, 0)) AS occupiedBedDays
            FROM Fact_Treatment ft
            JOIN Dim_Date dd
                ON dd.date_id = ft.date_id
            JOIN Dim_Ward w
                ON w.ward_sk = ft.ward_sk
            WHERE ft.ward_sk IS NOT NULL
              AND dd.full_date BETWEEN ? AND ?
            GROUP BY dd.full_date, w.ward_id, w.ward_name, w.ward_type, w.capacity
        ), ward_month AS (
            SELECT
                YEAR(fullDate) AS yearNum,
                MONTH(fullDate) AS monthNum,
                wardId,
                wardName,
                wardType,
                capacity,
                SUM(occupiedBedDays) AS monthOccupiedBedDays,
                DAY(LAST_DAY(MAX(fullDate))) AS daysInMonth
            FROM ward_day
            GROUP BY YEAR(fullDate), MONTH(fullDate), wardId, wardName, wardType, capacity
        )
        SELECT
            yearNum,
            monthNum,
            wardId,
            wardName,
            wardType,
            capacity,
            monthOccupiedBedDays,
            ROUND(100.0 * monthOccupiedBedDays / NULLIF(capacity * daysInMonth, 0), 2) AS utilizationPct,
            CASE
                WHEN 100.0 * monthOccupiedBedDays / NULLIF(capacity * daysInMonth, 0) >= 90 THEN 'Critical Over-Utilization'
                WHEN 100.0 * monthOccupiedBedDays / NULLIF(capacity * daysInMonth, 0) >= 75 THEN 'High Utilization'
                WHEN 100.0 * monthOccupiedBedDays / NULLIF(capacity * daysInMonth, 0) >= 50 THEN 'Moderate Utilization'
                ELSE 'Low Utilization'
            END AS utilizationBand
        FROM ward_month
        ORDER BY yearNum, monthNum, utilizationPct DESC, wardId`,
        [from, to],
      ),
      dwPool.query(
        `WITH disease_outcomes AS (
            SELECT
                d.disease_name AS diseaseName,
                SUM(ft.total_cases) AS totalCases,
                SUM(ft.readmitted_cases) AS readmittedCases,
                SUM(ft.recovered_cases) AS recoveredCases
            FROM Fact_Treatment ft
            JOIN Dim_Date dd
                ON dd.date_id = ft.date_id
            JOIN Dim_Disease d
                ON d.disease_sk = ft.disease_sk
            WHERE dd.full_date BETWEEN ? AND ?
            GROUP BY d.disease_name
        )
        SELECT
            diseaseName,
            totalCases,
            readmittedCases,
            recoveredCases,
            ROUND(100.0 * readmittedCases / NULLIF(totalCases, 0), 2) AS readmissionRatePct,
            ROUND(100.0 * recoveredCases / NULLIF(totalCases, 0), 2) AS recoveryRatePct
        FROM disease_outcomes
        WHERE totalCases >= 25
        ORDER BY readmissionRatePct DESC, totalCases DESC, diseaseName`,
        [from, to],
      ),
      dwPool.query(
        `WITH disease_monthly_outcomes AS (
          SELECT
            dd.year_num AS yearNum,
            dd.month_num AS monthNum,
            d.disease_name AS diseaseName,
            SUM(ft.total_cases) AS totalCases,
            SUM(ft.readmitted_cases) AS readmittedCases,
            SUM(ft.recovered_cases) AS recoveredCases
          FROM Fact_Treatment ft
          JOIN Dim_Date dd
            ON dd.date_id = ft.date_id
          JOIN Dim_Disease d
            ON d.disease_sk = ft.disease_sk
          WHERE dd.full_date BETWEEN ? AND ?
          GROUP BY dd.year_num, dd.month_num, d.disease_name
        )
        SELECT
          yearNum,
          monthNum,
          CONCAT(yearNum, '-', LPAD(monthNum, 2, '0')) AS monthLabel,
          diseaseName,
          totalCases,
          readmittedCases,
          recoveredCases,
          ROUND(100.0 * readmittedCases / NULLIF(totalCases, 0), 2) AS readmissionRatePct,
          ROUND(100.0 * recoveredCases / NULLIF(totalCases, 0), 2) AS recoveryRatePct
        FROM disease_monthly_outcomes
        WHERE totalCases > 0
        ORDER BY yearNum, monthNum, readmissionRatePct DESC, diseaseName`,
        [from, to],
      ),
    ]);

    const [q1DiseaseResourceTrend] = results[0];
    const [q2DoctorPerformanceRanking] = results[1];
    let [q2DoctorRecoveryTrend] = results[2];
    const [q3WardOverUtilization] = results[3];
    const [q5ReadmissionByDisease] = results[4];
    const [q5ReadmissionMonthlyByDisease] = results[5];

    if (!q2DoctorRecoveryTrend.length) {
      const [fallbackRows] = await oltpPool.query(
        `SELECT
            v.doctor_id AS doctorId,
            d.specialization AS specialization,
            d.department AS department,
            YEAR(v.visit_date) AS yearNum,
            MONTH(v.visit_date) AS monthNum,
            CONCAT(YEAR(v.visit_date), '-', LPAD(MONTH(v.visit_date), 2, '0')) AS monthLabel,
            COUNT(*) AS totalCases,
            SUM(CASE WHEN o.status = 'Recovered' THEN 1 ELSE 0 END) AS recoveredCases,
            SUM(CASE WHEN o.status = 'Readmitted' THEN 1 ELSE 0 END) AS readmittedCases,
            ROUND(100.0 * SUM(CASE WHEN o.status = 'Recovered' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS recoveryRatePct,
            ROUND(100.0 * SUM(CASE WHEN o.status = 'Readmitted' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS readmissionRatePct
         FROM Visit v
         JOIN Doctor d
             ON d.doctor_id = v.doctor_id
         LEFT JOIN Outcome o
             ON o.visit_id = v.visit_id
         WHERE v.visit_date BETWEEN ? AND ?
         GROUP BY
             v.doctor_id,
             d.specialization,
             d.department,
             YEAR(v.visit_date),
             MONTH(v.visit_date)
         HAVING totalCases > 0
         ORDER BY doctorId, yearNum, monthNum`,
        [from, to],
      );

      q2DoctorRecoveryTrend = fallbackRows;
    }

    res.json({
      q1DiseaseResourceTrend,
      q2DoctorPerformanceRanking,
      q2DoctorRecoveryTrend,
      q3WardOverUtilization,
      q5ReadmissionByDisease,
      q5ReadmissionMonthlyByDisease,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load analytics queries",
      error: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`CareOps API running at http://localhost:${port}`);
});
