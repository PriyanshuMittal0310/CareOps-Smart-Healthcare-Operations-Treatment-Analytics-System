import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Header,
  QueryTableCard,
  Q1_DEFAULT_VISIBLE_COLUMNS,
  buildQ1DiseaseRows,
  formatCount,
  formatMoney,
  q1Columns,
  q1MonthlyColumns,
  sortQ1Rows,
  toNumeric,
} from "./shared";

function Q1AnalyticsView({ title, description, rows }) {
  const [groupingMode, setGroupingMode] = useState("disease");
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(
    Q1_DEFAULT_VISIBLE_COLUMNS,
  );
  const [trendDiseaseFilter, setTrendDiseaseFilter] = useState("all");

  const diseaseRows = useMemo(() => buildQ1DiseaseRows(rows), [rows]);

  const sortedRows = useMemo(
    () => sortQ1Rows(diseaseRows, "totalTreatmentSpend", "desc"),
    [diseaseRows],
  );

  const monthlyRows = useMemo(() => {
    const grouped = new Map();

    rows.forEach((row) => {
      const yearNum = row.yearNum ?? "";
      const monthNum = row.monthNum ?? "";
      const diseaseName = row.diseaseName || "Unknown Disease";
      const monthLabel =
        row.monthLabel ||
        `${String(yearNum).padStart(4, "0")}-${String(monthNum).padStart(2, "0")}`;
      const totalCases = toNumeric(row.totalCases) ?? 0;
      const totalTreatmentSpend = toNumeric(row.totalTreatmentSpend) ?? 0;
      const totalBedDays = toNumeric(row.totalBedDays) ?? 0;
      const key = `${monthLabel}::${diseaseName}`;

      const current = grouped.get(key) || {
        monthLabel,
        diseaseName,
        totalCases: 0,
        totalTreatmentSpend: 0,
        totalBedDays: 0,
      };

      current.totalCases += totalCases;
      current.totalTreatmentSpend += totalTreatmentSpend;
      current.totalBedDays += totalBedDays;
      grouped.set(key, current);
    });

    return [...grouped.values()].sort((left, right) => {
      const monthCompare = String(left.monthLabel).localeCompare(
        String(right.monthLabel),
      );

      if (monthCompare !== 0) return monthCompare;

      return String(left.diseaseName).localeCompare(String(right.diseaseName));
    });
  }, [rows]);

  const trendDiseaseOptions = useMemo(
    () =>
      [
        ...new Set(monthlyRows.map((row) => row.diseaseName).filter(Boolean)),
      ].sort((left, right) => String(left).localeCompare(String(right))),
    [monthlyRows],
  );

  const effectiveTrendDiseaseFilter =
    trendDiseaseFilter === "all" ||
    trendDiseaseOptions.includes(trendDiseaseFilter)
      ? trendDiseaseFilter
      : "all";

  const monthlyTrendRows = useMemo(() => {
    const grouped = new Map();

    monthlyRows.forEach((row) => {
      if (
        effectiveTrendDiseaseFilter !== "all" &&
        row.diseaseName !== effectiveTrendDiseaseFilter
      ) {
        return;
      }

      const monthLabel = row.monthLabel;
      const totalCases = toNumeric(row.totalCases) ?? 0;
      const current = grouped.get(monthLabel) || {
        monthLabel,
        totalCases: 0,
      };

      current.totalCases += totalCases;
      grouped.set(monthLabel, current);
    });

    return [...grouped.values()].sort((left, right) =>
      String(left.monthLabel).localeCompare(String(right.monthLabel)),
    );
  }, [monthlyRows, effectiveTrendDiseaseFilter]);

  const visibleDiseaseColumns = useMemo(
    () => q1Columns.filter((column) => visibleColumns.includes(column.key)),
    [visibleColumns],
  );

  const summaryRows = useMemo(() => {
    const topRows = sortQ1Rows(
      diseaseRows,
      "totalTreatmentSpend",
      "desc",
    ).slice(0, 8);

    return topRows.map((row) => ({
      label: row.diseaseName,
      totalTreatmentSpend: toNumeric(row.totalTreatmentSpend) ?? 0,
      totalCases: toNumeric(row.totalCases) ?? 0,
    }));
  }, [diseaseRows]);

  function onToggleColumn(columnKey) {
    setVisibleColumns((previous) => {
      const exists = previous.includes(columnKey);
      if (exists && previous.length === 1) return previous;
      if (exists) return previous.filter((key) => key !== columnKey);
      return [...previous, columnKey];
    });
  }

  const tableRows = groupingMode === "month" ? monthlyRows : sortedRows;
  const tableColumns =
    groupingMode === "month" ? q1MonthlyColumns : visibleDiseaseColumns;
  const tableDescription =
    groupingMode === "month"
      ? `${description} Month-wise rows split by disease for selected date range.`
      : `${description} Showing grouped disease totals by selected date range.`;

  const chartTitle = "Summary Chart: Top Diseases by Spend";

  return (
    <>
      <section className="card q1-summary-card">
        <div className="card-head">
          <h3>{chartTitle}</h3>
        </div>
        <div className="chart-box q1-summary-chart">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={summaryRows}
              margin={{ top: 8, right: 8, left: 24, bottom: 60 }}
            >
              <CartesianGrid stroke="#dce9f4" strokeDasharray="4 4" />
              <XAxis
                dataKey="label"
                angle={-20}
                textAnchor="end"
                interval={0}
                height={70}
                tick={{ fontSize: 10 }}
                label={{
                  value: "Disease",
                  position: "insideBottom",
                  offset: -46,
                  fill: "#60788c",
                  fontSize: 11,
                }}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                width={90}
                label={{
                  value: "Total Treatment Spend",
                  angle: -90,
                  position: "left",
                  offset: 8,
                  fill: "#60788c",
                  fontSize: 11,
                }}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === "totalTreatmentSpend")
                    return [formatMoney(value), "Total Spend"];
                  if (name === "totalCases")
                    return [formatCount(value), "Total Cases"];
                  return [value, name];
                }}
              />
              <Bar
                dataKey="totalTreatmentSpend"
                fill="#0077b6"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card q1-summary-card">
        <div className="card-head">
          <h3>Month-wise Total Cases Trend</h3>
          <label className="field query-inline-field">
            Disease
            <select
              value={effectiveTrendDiseaseFilter}
              onChange={(event) => setTrendDiseaseFilter(event.target.value)}
            >
              <option value="all">All Diseases</option>
              {trendDiseaseOptions.map((diseaseName) => (
                <option key={diseaseName} value={diseaseName}>
                  {diseaseName}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="chart-box q1-summary-chart">
          {monthlyTrendRows.length === 0 ? (
            <p className="query-empty">
              No month-wise trend data available for selected disease.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={monthlyTrendRows}
                margin={{ top: 8, right: 16, left: 8, bottom: 20 }}
              >
                <CartesianGrid stroke="#dce9f4" strokeDasharray="4 4" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === "totalCases") {
                      return [formatCount(value), "Total Cases"];
                    }

                    return [value, name];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="totalCases"
                  name="Total Cases"
                  stroke="#00a896"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <QueryTableCard
        title={title}
        description={tableDescription}
        rows={tableRows}
        columns={tableColumns}
        rowKey={(row) =>
          groupingMode === "month"
            ? `month-${row.monthLabel}-${row.diseaseName}`
            : row.diseaseName
        }
        toolbarControls={
          <>
            <label className="field query-inline-field">
              Grouping
              <select
                value={groupingMode}
                onChange={(event) => setGroupingMode(event.target.value)}
              >
                <option value="disease">Disease-wise Group</option>
                <option value="month">Month-wise Group</option>
              </select>
            </label>

            {groupingMode === "disease" ? (
              <div className="q1-inline-toggle-wrap">
                <button
                  type="button"
                  className="q1-column-toggle"
                  onClick={() => setShowColumnSelector((value) => !value)}
                >
                  {showColumnSelector
                    ? "Hide Column Selector"
                    : "Show Column Selector"}
                </button>
              </div>
            ) : null}

            {showColumnSelector && groupingMode === "disease" ? (
              <div className="q1-inline-column-picker">
                {q1Columns.map((column) => {
                  const checked = visibleColumns.includes(column.key);
                  const disableUncheck = checked && visibleColumns.length === 1;

                  return (
                    <label key={column.key} className="q1-inline-column-option">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disableUncheck}
                        onChange={() => onToggleColumn(column.key)}
                      />
                      <span>{column.label}</span>
                    </label>
                  );
                })}
              </div>
            ) : null}
          </>
        }
      />
    </>
  );
}

export default function DiseasePage({ analyticsQueries, loading }) {
  const diseaseRows = analyticsQueries?.q1DiseaseResourceTrend ?? [];

  return (
    <div className="page-grid">
      <Header
        title="Disease Analytics"
        subtitle="Disease resource consumption trend"
      />

      {loading ? (
        <p className="loading-note">Loading disease analytics...</p>
      ) : null}

      <Q1AnalyticsView
        title="Disease Resource Consumption Trend"
        description="Disease spend view with column selector, sorting, and summary chart."
        rows={diseaseRows}
      />
    </div>
  );
}
