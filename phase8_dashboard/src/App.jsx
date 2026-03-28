import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./App.css";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/patients", label: "Patients", icon: "group" },
  { to: "/facility", label: "Facility Stats", icon: "local_hospital" },
  { to: "/analytics", label: "Analytics", icon: "analytics" },
  { to: "/readmission", label: "Readmission", icon: "monitoring" },
];

function App() {
  const [from, setFrom] = useState("2022-01-01");
  const [to, setTo] = useState("2023-12-31");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [meta, setMeta] = useState(null);
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [diseaseBurden, setDiseaseBurden] = useState([]);
  const [doctorPerformance, setDoctorPerformance] = useState([]);
  const [wardUtilization, setWardUtilization] = useState([]);
  const [readmission, setReadmission] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const query = useMemo(
    () => new URLSearchParams({ from, to }).toString(),
    [from, to],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const responses = await Promise.all([
          fetch("/api/meta"),
          fetch(`/api/overview?${query}`),
          fetch(`/api/trend-monthly?${query}`),
          fetch(`/api/disease-burden?${query}`),
          fetch(`/api/doctor-performance?${query}`),
          fetch(`/api/ward-utilization?${query}`),
          fetch(`/api/readmission?${query}`),
          fetch("/api/alerts"),
        ]);

        const failedResponse = responses.find((res) => !res.ok);
        if (failedResponse)
          throw new Error("Failed to load CareOps analytics.");

        const [
          metaJson,
          overviewJson,
          trendJson,
          diseaseJson,
          doctorJson,
          wardJson,
          readmissionJson,
          alertsJson,
        ] = await Promise.all(responses.map((res) => res.json()));

        if (cancelled) return;

        setMeta(metaJson);
        setOverview(overviewJson);
        setTrend(trendJson);
        setDiseaseBurden(diseaseJson);
        setDoctorPerformance(doctorJson);
        setWardUtilization(wardJson);
        setReadmission(readmissionJson);
        setAlerts(alertsJson);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [query]);

  const shared = {
    from,
    to,
    setFrom,
    setTo,
    error,
    loading,
    meta,
    overview,
    trend,
    diseaseBurden,
    doctorPerformance,
    wardUtilization,
    readmission,
    alerts,
  };

  return (
    <BrowserRouter>
      <div className="careops-layout">
        <aside className="side-nav">
          <div className="brand-wrap">
            <h1>CareOps</h1>
            <p>Clinical Curator</p>
          </div>

          <nav className="nav-links">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  isActive ? "nav-item active" : "nav-item"
                }
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="careops-main">
          <header className="top-bar">
            <div className="search-wrap">
              <span className="material-symbols-outlined">search</span>
              <input placeholder="Search patients, conditions, or IDs..." />
            </div>

            <div className="date-wrap">
              <label>
                From
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
              <label>
                To
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>
            </div>

            <div className="top-actions">
              <button className="icon-btn" type="button">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <button className="icon-btn" type="button">
                <span className="material-symbols-outlined">help_outline</span>
              </button>
            </div>
          </header>

          <section className="careops-content">
            {error ? <p className="error-banner">{error}</p> : null}

            <Routes>
              <Route path="/" element={<DashboardPage {...shared} />} />
              <Route
                path="/dashboard"
                element={<DashboardPage {...shared} />}
              />
              <Route path="/patients" element={<PatientsPage {...shared} />} />
              <Route path="/facility" element={<FacilityPage {...shared} />} />
              <Route
                path="/analytics"
                element={<AnalyticsPage {...shared} />}
              />
              <Route
                path="/readmission"
                element={<ReadmissionPage {...shared} />}
              />
            </Routes>
          </section>
        </div>
      </div>
    </BrowserRouter>
  );
}

function Header({ title, subtitle }) {
  return (
    <section className="page-header">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </section>
  );
}

function Kpi({ label, value, tone }) {
  return (
    <article className={`kpi-card ${tone}`}>
      <p>{label}</p>
      <h3>{value}</h3>
    </article>
  );
}

function DashboardPage({ overview, trend, loading, meta }) {
  return (
    <div className="page-grid">
      <Header
        title="Operations Dashboard"
        subtitle={`Warehouse rows: ${meta?.factRows ?? 0} | Last date: ${meta?.lastFactDate ?? "n/a"}`}
      />

      <section className="kpi-grid">
        <Kpi
          label="Total Cases"
          value={overview?.totalCases ?? 0}
          tone="blue"
        />
        <Kpi
          label="Recovered Cases"
          value={overview?.recoveredCases ?? 0}
          tone="teal"
        />
        <Kpi
          label="Readmitted Cases"
          value={overview?.readmittedCases ?? 0}
          tone="slate"
        />
        <Kpi
          label="Avg Cost"
          value={overview?.avgTreatmentCost ?? 0}
          tone="soft"
        />
      </section>

      <section className="card">
        <div className="card-head">
          <h3>Monthly Cases vs Cost</h3>
        </div>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={trend}>
              <CartesianGrid stroke="#dce9f4" strokeDasharray="4 4" />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="totalCases"
                stroke="#0077b6"
                strokeWidth={3}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="avgCost"
                stroke="#00b4d8"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {loading ? <p className="loading-note">Loading...</p> : null}
      </section>
    </div>
  );
}

function PatientsPage({ overview, diseaseBurden, alerts }) {
  const demographics = [
    { name: "65+ Years", value: 65, color: "#0077b6" },
    { name: "18-64 Years", value: 25, color: "#4f6d86" },
    { name: "Under 18", value: 10, color: "#90e0ef" },
  ];

  const patientRows = alerts.map((a) => {
    const risk =
      a.daysStayed >= 10
        ? "Critical"
        : a.daysStayed >= 7
          ? "High Risk"
          : "Stable";
    return {
      id: `PX-${String(a.patientId).padStart(4, "0")}`,
      patient: a.patientId,
      condition: a.alertMessage || "Observation required",
      date: new Date(a.createdAt).toLocaleDateString(),
      risk,
      ward: a.wardId,
    };
  });

  return (
    <div className="page-grid">
      <Header
        title="Patient Analytics"
        subtitle={`Managing ${overview?.totalCases ?? 0} case records across departments`}
      />

      <section className="hero-cards">
        <Kpi
          label="Avg Stay"
          value={`${((overview?.totalBedDays ?? 0) / Math.max(overview?.totalCases ?? 1, 1)).toFixed(1)} Days`}
          tone="blue"
        />
        <Kpi
          label="Capacity Proxy"
          value={`${Math.min(99, Number(overview?.readmissionRatePct ?? 0) + 70).toFixed(1)}%`}
          tone="teal"
        />
      </section>

      <section className="patients-layout">
        <aside className="card filter-panel">
          <div className="card-head">
            <h3>Active Filters</h3>
            <button className="text-btn" type="button">
              Clear All
            </button>
          </div>

          <div className="chip-row">
            <span className="chip active">High Risk</span>
            <span className="chip">Critical</span>
            <span className="chip">Stable</span>
            <span className="chip">Observation</span>
          </div>

          <label className="field">
            Department
            <select>
              <option>All Departments</option>
              <option>Emergency</option>
              <option>ICU</option>
              <option>Oncology</option>
            </select>
          </label>

          <label className="field">
            Age Range
            <input type="range" min="0" max="100" defaultValue="65" />
          </label>
        </aside>

        <div className="main-stack">
          <section className="card">
            <div className="card-head">
              <h3>Departmental Patient Load</h3>
            </div>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={diseaseBurden.slice(0, 7)}>
                  <CartesianGrid stroke="#dce9f4" strokeDasharray="4 4" />
                  <XAxis dataKey="diseaseCode" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar
                    dataKey="totalCases"
                    fill="#0077b6"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card table-card">
            <div className="card-head">
              <h3>Active Patient Directory</h3>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Patient</th>
                    <th>Condition</th>
                    <th>Admission Date</th>
                    <th>Risk</th>
                    <th>Ward</th>
                  </tr>
                </thead>
                <tbody>
                  {patientRows.map((r) => (
                    <tr key={`${r.id}-${r.date}`}>
                      <td>{r.id}</td>
                      <td>{r.patient}</td>
                      <td>{r.condition}</td>
                      <td>{r.date}</td>
                      <td>
                        <span
                          className={`risk-badge ${r.risk.toLowerCase().replace(" ", "-")}`}
                        >
                          {r.risk}
                        </span>
                      </td>
                      <td>Ward {r.ward}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="card demographic-card">
          <div className="card-head">
            <h3>Patient Demographics</h3>
          </div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={demographics}
                  dataKey="value"
                  innerRadius={50}
                  outerRadius={80}
                >
                  {demographics.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </section>
    </div>
  );
}

function FacilityPage({ wardUtilization, trend, overview }) {
  const occupancy = Math.min(
    99.9,
    ((overview?.totalBedDays ?? 0) / Math.max(overview?.totalCases ?? 1, 1)) *
      12,
  );

  return (
    <div className="page-grid">
      <Header
        title="Facility Stats"
        subtitle="Operational resource intelligence for real-time clinical oversight"
      />

      <section className="kpi-grid">
        <Kpi
          label="Global Occupancy"
          value={`${occupancy.toFixed(1)}%`}
          tone="blue"
        />
        <Kpi label="Staffing Ratio" value="1:4.2" tone="slate" />
        <Kpi label="Critical Assets" value="128" tone="teal" />
        <Kpi
          label="Active Alerts"
          value={
            wardUtilization.filter((w) => Number(w.bedDaysPerCapacity) > 20)
              .length
          }
          tone="danger"
        />
      </section>

      <section className="card">
        <div className="card-head">
          <h3>Staffing Levels per Shift</h3>
        </div>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={trend.slice(-8)}>
              <CartesianGrid stroke="#dce9f4" strokeDasharray="4 4" />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="totalCases" fill="#0077b6" radius={[4, 4, 0, 0]} />
              <Bar
                dataKey="readmittedCases"
                fill="#4f6d86"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

function AnalyticsPage({ doctorPerformance }) {
  return (
    <div className="page-grid">
      <Header
        title="Doctor Performance Analytics"
        subtitle="Top doctors ranked by recovery rate and volume"
      />
      <section className="card table-card">
        <div className="card-head">
          <h3>Doctor Ranking</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Doctor ID</th>
                <th>Specialization</th>
                <th>Experience</th>
                <th>Total Cases</th>
                <th>Recovery Rate</th>
              </tr>
            </thead>
            <tbody>
              {doctorPerformance.map((row) => (
                <tr key={row.doctorId}>
                  <td>{row.doctorId}</td>
                  <td>{row.specialization}</td>
                  <td>{row.experienceBand}</td>
                  <td>{row.totalCases}</td>
                  <td>{row.recoveryRatePct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ReadmissionPage({ readmission }) {
  return (
    <div className="page-grid">
      <Header
        title="Readmission Risk"
        subtitle="Disease-level readmission hotspots"
      />
      <section className="card table-card">
        <div className="card-head">
          <h3>Readmission by Disease</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Disease</th>
                <th>Total Cases</th>
                <th>Readmitted</th>
                <th>Rate</th>
              </tr>
            </thead>
            <tbody>
              {readmission.map((r) => (
                <tr key={r.diseaseCode}>
                  <td>{r.diseaseName}</td>
                  <td>{r.totalCases}</td>
                  <td>{r.readmittedCases}</td>
                  <td>{r.readmissionRatePct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default App;
