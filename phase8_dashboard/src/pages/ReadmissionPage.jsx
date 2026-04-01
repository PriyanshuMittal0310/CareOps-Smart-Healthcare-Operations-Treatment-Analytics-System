import { useMemo, useState } from "react";
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
import {
  Header,
  Kpi,
  QueryTableCard,
  formatCount,
  formatPercent,
  q5Columns,
  q5MonthlyColumns,
  readmissionDonutColors,
  readmissionSeverity,
  toNumeric,
} from "./shared";

export default function ReadmissionPage({ analyticsQueries, loading }) {
  const readmissionRows = analyticsQueries?.q5ReadmissionByDisease ?? [];
  const monthlyReadmissionRows =
    analyticsQueries?.q5ReadmissionMonthlyByDisease ?? [];
  const [groupingMode, setGroupingMode] = useState("disease");
  const [riskFilter, setRiskFilter] = useState("all");
  const [minCases, setMinCases] = useState("0");
  const [trendDiseaseFilter, setTrendDiseaseFilter] = useState("all");

  const normalizedRows = useMemo(
    () =>
      readmissionRows.map((row) => ({
        ...row,
        totalCases: toNumeric(row.totalCases) ?? 0,
        readmittedCases: toNumeric(row.readmittedCases) ?? 0,
        recoveredCases: toNumeric(row.recoveredCases) ?? 0,
        readmissionRatePct: toNumeric(row.readmissionRatePct) ?? 0,
        recoveryRatePct: toNumeric(row.recoveryRatePct) ?? 0,
      })),
    [readmissionRows],
  );

  const normalizedMonthlyRows = useMemo(
    () =>
      monthlyReadmissionRows.map((row) => {
        const monthLabel =
          row.monthLabel ||
          `${String(row.yearNum || "").padStart(4, "0")}-${String(row.monthNum || "").padStart(2, "0")}`;
        const totalCases = toNumeric(row.totalCases) ?? 0;
        const readmittedCases = toNumeric(row.readmittedCases) ?? 0;
        const recoveredCases = toNumeric(row.recoveredCases) ?? 0;
        const readmissionRatePct =
          toNumeric(row.readmissionRatePct) ??
          (totalCases > 0
            ? (100 * readmittedCases) / Math.max(totalCases, 1)
            : 0);
        const recoveryRatePct =
          toNumeric(row.recoveryRatePct) ??
          (totalCases > 0
            ? (100 * recoveredCases) / Math.max(totalCases, 1)
            : 0);

        return {
          monthLabel,
          diseaseName: row.diseaseName || "Unknown Disease",
          totalCases,
          readmittedCases,
          recoveredCases,
          readmissionRatePct,
          recoveryRatePct,
        };
      }),
    [monthlyReadmissionRows],
  );

  const readmissionTrendDiseaseOptions = useMemo(
    () =>
      [
        ...new Set(
          normalizedMonthlyRows.map((row) => row.diseaseName).filter(Boolean),
        ),
      ].sort((left, right) => String(left).localeCompare(String(right))),
    [normalizedMonthlyRows],
  );

  const effectiveTrendDiseaseFilter =
    trendDiseaseFilter === "all" ||
    readmissionTrendDiseaseOptions.includes(trendDiseaseFilter)
      ? trendDiseaseFilter
      : "all";

  const readmittedTrendRows = useMemo(() => {
    const grouped = new Map();

    normalizedMonthlyRows.forEach((row) => {
      if (
        effectiveTrendDiseaseFilter !== "all" &&
        row.diseaseName !== effectiveTrendDiseaseFilter
      ) {
        return;
      }

      const monthLabel = row.monthLabel;
      const current = grouped.get(monthLabel) || {
        monthLabel,
        readmittedCases: 0,
      };

      current.readmittedCases += row.readmittedCases;
      grouped.set(monthLabel, current);
    });

    return [...grouped.values()].sort((left, right) =>
      String(left.monthLabel).localeCompare(String(right.monthLabel)),
    );
  }, [normalizedMonthlyRows, effectiveTrendDiseaseFilter]);

  const minCasesNum = toNumeric(minCases) ?? 0;

  const filteredRows = useMemo(
    () =>
      normalizedRows
        .filter((row) => row.totalCases >= minCasesNum)
        .filter(
          (row) =>
            riskFilter === "all" ||
            readmissionSeverity(row.readmissionRatePct) === riskFilter,
        ),
    [normalizedRows, minCasesNum, riskFilter],
  );

  const filteredMonthlyRows = useMemo(
    () =>
      normalizedMonthlyRows
        .filter((row) => row.totalCases >= minCasesNum)
        .filter(
          (row) =>
            riskFilter === "all" ||
            readmissionSeverity(row.readmissionRatePct) === riskFilter,
        )
        .sort((left, right) => {
          const monthCompare = String(left.monthLabel).localeCompare(
            String(right.monthLabel),
          );

          if (monthCompare !== 0) return monthCompare;

          return String(left.diseaseName).localeCompare(
            String(right.diseaseName),
          );
        }),
    [normalizedMonthlyRows, minCasesNum, riskFilter],
  );

  const totalCases = useMemo(
    () => filteredRows.reduce((sum, row) => sum + row.totalCases, 0),
    [filteredRows],
  );
  const totalReadmitted = useMemo(
    () => filteredRows.reduce((sum, row) => sum + row.readmittedCases, 0),
    [filteredRows],
  );

  const avgReadmissionRate =
    totalCases > 0 ? (100 * totalReadmitted) / Math.max(totalCases, 1) : null;

  const highestRiskDisease =
    filteredRows.length > 0
      ? [...filteredRows].sort(
          (left, right) => right.readmissionRatePct - left.readmissionRatePct,
        )[0]
      : null;

  const lowestRecoveryDisease =
    filteredRows.length > 0
      ? [...filteredRows].sort(
          (left, right) => left.recoveryRatePct - right.recoveryRatePct,
        )[0]
      : null;

  const outcomeChartRows = useMemo(
    () =>
      [...filteredRows]
        .sort((left, right) => right.totalCases - left.totalCases)
        .slice(0, 10),
    [filteredRows],
  );

  const readmissionShareRows = useMemo(() => {
    const total = filteredRows.reduce(
      (sum, row) => sum + row.readmittedCases,
      0,
    );

    return [...filteredRows]
      .filter((row) => row.readmittedCases > 0)
      .sort((left, right) => right.readmittedCases - left.readmittedCases)
      .slice(0, 8)
      .map((row) => ({
        ...row,
        readmissionSharePct:
          total > 0 ? (100 * row.readmittedCases) / Math.max(total, 1) : 0,
      }));
  }, [filteredRows]);

  const readmissionShareLegendRows = useMemo(
    () =>
      readmissionShareRows.map((row, index) => ({
        ...row,
        color: readmissionDonutColors[index % readmissionDonutColors.length],
      })),
    [readmissionShareRows],
  );

  const tableRows =
    groupingMode === "month" ? filteredMonthlyRows : filteredRows;
  const tableColumns = groupingMode === "month" ? q5MonthlyColumns : q5Columns;
  const tableTitle =
    groupingMode === "month"
      ? "Readmission Month-wise Trend"
      : "Readmission Rate by Disease";
  const tableDescription =
    groupingMode === "month"
      ? "Month-wise readmission rows with disease-level split for selected date range."
      : "Disease-level readmission and recovery rates with filtering, searchable table, and sortable columns.";

  return (
    <div className="page-grid">
      <Header
        title="Readmission Risk"
        subtitle="Disease-level readmission intelligence with KPI, charts, and filters"
      />

      {loading ? (
        <p className="loading-note">Loading readmission analytics...</p>
      ) : null}

      <section className="kpi-grid readmission-kpi-grid">
        <Kpi
          label="Avg Readmission Rate"
          value={
            avgReadmissionRate === null
              ? "n/a"
              : formatPercent(avgReadmissionRate)
          }
          tone="danger"
        />
        <Kpi
          label="Highest Risk Disease"
          value={
            highestRiskDisease
              ? `${highestRiskDisease.diseaseName} (${formatPercent(highestRiskDisease.readmissionRatePct)})`
              : "n/a"
          }
          tone="blue"
        />
        <Kpi
          label="Lowest Recovery Rate"
          value={
            lowestRecoveryDisease
              ? `${lowestRecoveryDisease.diseaseName} (${formatPercent(lowestRecoveryDisease.recoveryRatePct)})`
              : "n/a"
          }
          tone="slate"
        />
        <Kpi
          label="Filtered Diseases"
          value={formatCount(filteredRows.length)}
          tone="teal"
        />
      </section>

      <section className="readmission-charts-grid">
        <section className="card readmission-wide-card">
          <div className="card-head">
            <h3>Readmitted vs Recovered</h3>
          </div>
          <div className="chart-box readmission-chart-box">
            {outcomeChartRows.length === 0 ? (
              <p className="query-empty">
                No chart data available for selected filters.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={380}>
                <BarChart
                  data={outcomeChartRows}
                  margin={{ top: 8, right: 8, left: 8, bottom: 56 }}
                >
                  <CartesianGrid stroke="#dce9f4" strokeDasharray="4 4" />
                  <XAxis
                    dataKey="diseaseName"
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                    height={64}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === "readmittedCases") {
                        return [formatCount(value), "Readmitted"];
                      }

                      if (name === "recoveredCases") {
                        return [formatCount(value), "Recovered"];
                      }

                      return [value, name];
                    }}
                  />
                  <Bar
                    dataKey="readmittedCases"
                    fill="#c94747"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="recoveredCases"
                    fill="#0077b6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h3>Readmission Share by Disease</h3>
          </div>
          <div className="chart-box readmission-chart-box">
            {readmissionShareRows.length === 0 ? (
              <p className="query-empty">
                No chart data available for selected filters.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={readmissionShareLegendRows}
                    dataKey="readmittedCases"
                    nameKey="diseaseName"
                    innerRadius={58}
                    outerRadius={96}
                    paddingAngle={2}
                  >
                    {readmissionShareLegendRows.map((row) => (
                      <Cell
                        key={`readmission-share-${row.diseaseName}`}
                        fill={row.color}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, payload) => {
                      const item = payload?.payload;
                      return [
                        `${formatCount(value)} (${formatPercent(item?.readmissionSharePct ?? 0)})`,
                        name,
                      ];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}

            {readmissionShareLegendRows.length > 0 ? (
              <div className="readmission-share-legend">
                {readmissionShareLegendRows.map((row) => (
                  <div
                    className="readmission-legend-item"
                    key={`legend-${row.diseaseName}`}
                  >
                    <span
                      className="readmission-legend-swatch"
                      style={{ backgroundColor: row.color }}
                      aria-hidden="true"
                    />
                    <span
                      className="readmission-legend-label"
                      title={row.diseaseName}
                    >
                      {row.diseaseName}
                    </span>
                    <span className="readmission-legend-value">
                      {formatPercent(row.readmissionSharePct)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      </section>

      <section className="card readmission-wide-card">
        <div className="card-head">
          <h3>Month-wise Readmitted Cases Trend</h3>
          <label className="field query-inline-field">
            Disease
            <select
              value={effectiveTrendDiseaseFilter}
              onChange={(event) => setTrendDiseaseFilter(event.target.value)}
            >
              <option value="all">All Diseases</option>
              {readmissionTrendDiseaseOptions.map((diseaseName) => (
                <option key={diseaseName} value={diseaseName}>
                  {diseaseName}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="chart-box readmission-chart-box">
          {readmittedTrendRows.length === 0 ? (
            <p className="query-empty">
              No month-wise readmission trend data available for selected
              disease.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={readmittedTrendRows}
                margin={{ top: 8, right: 12, left: 8, bottom: 20 }}
              >
                <CartesianGrid stroke="#dce9f4" strokeDasharray="4 4" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === "readmittedCases") {
                      return [formatCount(value), "Readmitted Cases"];
                    }

                    return [value, name];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="readmittedCases"
                  name="Readmitted Cases"
                  stroke="#c94747"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <QueryTableCard
        title={tableTitle}
        description={tableDescription}
        rows={tableRows}
        columns={tableColumns}
        rowKey={(row) =>
          groupingMode === "month"
            ? `month-${row.monthLabel}-${row.diseaseName}`
            : row.diseaseName
        }
        searchPlaceholder={
          groupingMode === "month"
            ? "Type month or disease (e.g. 2023-05, Asthma)..."
            : "Type disease name..."
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

            <label className="field query-inline-field">
              Risk Band
              <select
                value={riskFilter}
                onChange={(event) => setRiskFilter(event.target.value)}
              >
                <option value="all">All</option>
                <option value="high">High</option>
                <option value="moderate">Moderate</option>
                <option value="low">Low</option>
              </select>
            </label>

            <label className="field query-inline-field">
              Minimum Cases
              <select
                value={minCases}
                onChange={(event) => setMinCases(event.target.value)}
              >
                <option value="0">0</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="75">75</option>
              </select>
            </label>
          </>
        }
      />
    </div>
  );
}
