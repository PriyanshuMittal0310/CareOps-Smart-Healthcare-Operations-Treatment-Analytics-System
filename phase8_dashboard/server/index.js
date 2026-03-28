const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config();

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

app.get("/api/disease-burden", async (req, res) => {
  try {
    const [from, to] = parseDateRange(req.query);
    const [rows] = await dwPool.query(
      `SELECT
          dis.disease_code AS diseaseCode,
          dis.disease_name AS diseaseName,
          CASE
            WHEN CHAR_LENGTH(dis.disease_name) > 16 THEN CONCAT(LEFT(dis.disease_name, 16), '...')
            ELSE dis.disease_name
          END AS diseaseShort,
          SUM(ft.total_bed_days) AS totalBedDays,
          ROUND(AVG(ft.avg_treatment_cost), 2) AS avgCost,
          SUM(ft.total_cases) AS totalCases
       FROM Fact_Treatment ft
       JOIN Dim_Disease dis ON dis.disease_sk = ft.disease_sk
       JOIN Dim_Date dd ON dd.date_id = ft.date_id
       WHERE dd.full_date BETWEEN ? AND ?
       GROUP BY dis.disease_code, dis.disease_name
       ORDER BY totalBedDays DESC
       LIMIT 10`,
      [from, to],
    );

    res.json(rows);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to load disease burden", error: error.message });
  }
});

app.get("/api/doctor-performance", async (req, res) => {
  try {
    const [from, to] = parseDateRange(req.query);
    const [rows] = await dwPool.query(
      `SELECT
          doc.doctor_id AS doctorId,
          doc.specialization AS specialization,
          doc.experience_band AS experienceBand,
          SUM(ft.total_cases) AS totalCases,
          SUM(ft.recovered_cases) AS recoveredCases,
          SUM(ft.readmitted_cases) AS readmittedCases,
          ROUND((SUM(ft.recovered_cases) / NULLIF(SUM(ft.total_cases), 0)) * 100, 2) AS recoveryRatePct
       FROM Fact_Treatment ft
       JOIN Dim_Doctor doc ON doc.doctor_sk = ft.doctor_sk
       JOIN Dim_Date dd ON dd.date_id = ft.date_id
       WHERE dd.full_date BETWEEN ? AND ?
       GROUP BY doc.doctor_id, doc.specialization, doc.experience_band
       HAVING totalCases > 0
       ORDER BY recoveryRatePct DESC, totalCases DESC
       LIMIT 12`,
      [from, to],
    );

    res.json(rows);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Failed to load doctor performance",
        error: error.message,
      });
  }
});

app.get("/api/ward-utilization", async (req, res) => {
  try {
    const [from, to] = parseDateRange(req.query);
    const [rows] = await dwPool.query(
      `SELECT
          ward.ward_id AS wardId,
          ward.ward_name AS wardName,
          ward.capacity AS capacity,
          COALESCE(SUM(ft.total_bed_days), 0) AS bedDays,
          ROUND(COALESCE(SUM(ft.total_bed_days), 0) / NULLIF(ward.capacity, 0), 2) AS bedDaysPerCapacity
       FROM Dim_Ward ward
       LEFT JOIN Fact_Treatment ft ON ward.ward_sk = ft.ward_sk
       LEFT JOIN Dim_Date dd ON dd.date_id = ft.date_id
       WHERE dd.full_date BETWEEN ? AND ? OR dd.full_date IS NULL
       GROUP BY ward.ward_id, ward.ward_name, ward.capacity
       ORDER BY bedDays DESC`,
      [from, to],
    );

    res.json(rows);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Failed to load ward utilization",
        error: error.message,
      });
  }
});

app.get("/api/readmission", async (req, res) => {
  try {
    const [from, to] = parseDateRange(req.query);
    const [rows] = await dwPool.query(
      `SELECT
          dis.disease_code AS diseaseCode,
          dis.disease_name AS diseaseName,
          SUM(ft.total_cases) AS totalCases,
          SUM(ft.readmitted_cases) AS readmittedCases,
          ROUND((SUM(ft.readmitted_cases) / NULLIF(SUM(ft.total_cases), 0)) * 100, 2) AS readmissionRatePct
       FROM Fact_Treatment ft
       JOIN Dim_Disease dis ON dis.disease_sk = ft.disease_sk
       JOIN Dim_Date dd ON dd.date_id = ft.date_id
       WHERE dd.full_date BETWEEN ? AND ?
       GROUP BY dis.disease_code, dis.disease_name
       HAVING totalCases > 0
       ORDER BY readmissionRatePct DESC, totalCases DESC
       LIMIT 12`,
      [from, to],
    );

    res.json(rows);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Failed to load readmission analytics",
        error: error.message,
      });
  }
});

app.get("/api/alerts", async (_req, res) => {
  try {
    const [rows] = await oltpPool.query(
      `SELECT alert_id AS alertId, patient_id AS patientId, ward_id AS wardId, days_stayed AS daysStayed, alert_message AS alertMessage, created_at AS createdAt
       FROM AlertLog
       ORDER BY created_at DESC
       LIMIT 10`,
    );

    res.json(rows);
  } catch {
    // Alert log can be empty or trigger may not be installed yet.
    res.json([]);
  }
});

app.listen(port, () => {
  console.log(`CareOps API running at http://localhost:${port}`);
});
