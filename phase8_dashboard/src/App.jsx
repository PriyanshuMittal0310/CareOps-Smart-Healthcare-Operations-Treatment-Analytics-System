import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import DiseasePage from "./pages/DiseasePage";
import DoctorPage from "./pages/DoctorPage";
import WardPage from "./pages/WardPage";
import ReadmissionPage from "./pages/ReadmissionPage";
import "./App.css";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/disease", label: "Disease", icon: "biotech" },
  { to: "/doctor", label: "Doctor", icon: "medical_services" },
  { to: "/ward", label: "Ward", icon: "bed" },
  { to: "/readmission", label: "Readmission", icon: "monitoring" },
];

const EMPTY_ANALYTICS_QUERIES = {
  q1DiseaseResourceTrend: [],
  q2DoctorPerformanceRanking: [],
  q2DoctorRecoveryTrend: [],
  q3WardOverUtilization: [],
  q5ReadmissionByDisease: [],
  q5ReadmissionMonthlyByDisease: [],
};

function App() {
  const [from, setFrom] = useState("2022-01-01");
  const [to, setTo] = useState("2023-12-31");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [meta, setMeta] = useState(null);
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [analyticsQueries, setAnalyticsQueries] = useState(
    EMPTY_ANALYTICS_QUERIES,
  );

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
          fetch(`/api/analytics-queries?${query}`),
        ]);

        const failedResponse = responses.find((res) => !res.ok);
        if (failedResponse) {
          throw new Error("Failed to load CareOps analytics.");
        }

        const [metaJson, overviewJson, trendJson, analyticsJson] =
          await Promise.all(responses.map((res) => res.json()));

        if (cancelled) return;

        setMeta(metaJson);
        setOverview(overviewJson);
        setTrend(trendJson);
        setAnalyticsQueries({ ...EMPTY_ANALYTICS_QUERIES, ...analyticsJson });
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load data");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
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
    analyticsQueries,
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
                  onChange={(event) => setFrom(event.target.value)}
                />
              </label>
              <label>
                To
                <input
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
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
              <Route path="/disease" element={<DiseasePage {...shared} />} />
              <Route path="/analytics" element={<DiseasePage {...shared} />} />
              <Route path="/doctor" element={<DoctorPage {...shared} />} />
              <Route path="/ward" element={<WardPage {...shared} />} />
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

export default App;
