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
  formatCount,
  formatPercent,
  q2Columns,
  q2MonthlyColumns,
  readmissionSeverity,
  toNumeric,
} from "./shared";

export default function DoctorPage({ analyticsQueries, loading }) {
  const doctorRows = analyticsQueries?.q2DoctorPerformanceRanking ?? [];
  const doctorTrendRows = analyticsQueries?.q2DoctorRecoveryTrend ?? [];
  const [specializationFilter, setSpecializationFilter] = useState("all");
  const [minCases, setMinCases] = useState("0");
  const [groupingMode, setGroupingMode] = useState("doctor");
  const [doctorIdInput, setDoctorIdInput] = useState("");

  const normalizedDoctorRows = useMemo(
    () =>
      doctorRows.map((row) => ({
        ...row,
        doctorId: String(row.doctorId),
        totalCases: toNumeric(row.totalCases) ?? 0,
        recoveredCases: toNumeric(row.recoveredCases) ?? 0,
        readmittedCases: toNumeric(row.readmittedCases) ?? 0,
        recoveryRatePct: toNumeric(row.recoveryRatePct) ?? 0,
        readmissionRatePct: toNumeric(row.readmissionRatePct) ?? 0,
        weightedAvgTreatmentCost: toNumeric(row.weightedAvgTreatmentCost) ?? 0,
      })),
    [doctorRows],
  );

  const specializationOptions = useMemo(
    () =>
      [
        ...new Set(
          normalizedDoctorRows.map((row) => row.specialization).filter(Boolean),
        ),
      ].sort((left, right) => String(left).localeCompare(String(right))),
    [normalizedDoctorRows],
  );

  const minCasesNum = toNumeric(minCases) ?? 0;

  const filteredDoctorRows = useMemo(() => {
    const filtered = normalizedDoctorRows
      .filter(
        (row) =>
          specializationFilter === "all" ||
          row.specialization === specializationFilter,
      )
      .filter((row) => row.totalCases >= minCasesNum);

    return filtered.sort((left, right) => {
      if (left.recoveryRatePct !== right.recoveryRatePct) {
        return right.recoveryRatePct - left.recoveryRatePct;
      }

      if (left.readmissionRatePct !== right.readmissionRatePct) {
        return left.readmissionRatePct - right.readmissionRatePct;
      }

      return right.totalCases - left.totalCases;
    });
  }, [normalizedDoctorRows, specializationFilter, minCasesNum]);

  const topRecoveryRows = useMemo(
    () =>
      [...filteredDoctorRows]
        .sort((left, right) => {
          if (left.recoveryRatePct !== right.recoveryRatePct) {
            return right.recoveryRatePct - left.recoveryRatePct;
          }

          if (left.readmissionRatePct !== right.readmissionRatePct) {
            return left.readmissionRatePct - right.readmissionRatePct;
          }

          return right.totalCases - left.totalCases;
        })
        .slice(0, 10),
    [filteredDoctorRows],
  );

  const topRecoveryChartRows = useMemo(
    () =>
      topRecoveryRows.map((row) => ({
        doctorLabel: `Dr ${row.doctorId}`,
        recoveryRatePct: row.recoveryRatePct,
        totalCases: row.totalCases,
      })),
    [topRecoveryRows],
  );

  const normalizedTrendRows = useMemo(
    () =>
      doctorTrendRows.map((row) => ({
        ...row,
        doctorId: String(row.doctorId),
        monthLabel:
          row.monthLabel ||
          `${String(row.yearNum || "").padStart(4, "0")}-${String(row.monthNum || "").padStart(2, "0")}`,
        totalCases: toNumeric(row.totalCases) ?? 0,
        recoveryRatePct: toNumeric(row.recoveryRatePct) ?? 0,
        readmissionRatePct: toNumeric(row.readmissionRatePct) ?? 0,
      })),
    [doctorTrendRows],
  );

  const trendDoctorIds = useMemo(
    () => new Set(normalizedTrendRows.map((row) => row.doctorId)),
    [normalizedTrendRows],
  );

  const defaultDoctorId = useMemo(() => {
    const firstFilteredWithTrend = filteredDoctorRows.find((row) =>
      trendDoctorIds.has(row.doctorId),
    );

    if (firstFilteredWithTrend) {
      return firstFilteredWithTrend.doctorId;
    }

    return (
      normalizedTrendRows[0]?.doctorId ?? filteredDoctorRows[0]?.doctorId ?? ""
    );
  }, [filteredDoctorRows, trendDoctorIds, normalizedTrendRows]);

  const requestedDoctorId = doctorIdInput.trim();
  const effectiveDoctorId =
    requestedDoctorId && trendDoctorIds.has(requestedDoctorId)
      ? requestedDoctorId
      : defaultDoctorId;
  const showingFallbackDoctor =
    Boolean(requestedDoctorId) && requestedDoctorId !== effectiveDoctorId;

  const selectedDoctorTrend = useMemo(
    () =>
      normalizedTrendRows
        .filter((row) => row.doctorId === effectiveDoctorId)
        .sort((left, right) =>
          String(left.monthLabel).localeCompare(String(right.monthLabel)),
        ),
    [normalizedTrendRows, effectiveDoctorId],
  );

  const monthlyGroupedRows = useMemo(() => {
    return normalizedTrendRows
      .filter(
        (row) =>
          specializationFilter === "all" ||
          row.specialization === specializationFilter,
      )
      .filter((row) => row.totalCases >= minCasesNum)
      .sort((left, right) => {
        const monthCompare = String(left.monthLabel).localeCompare(
          String(right.monthLabel),
        );

        if (monthCompare !== 0) return monthCompare;

        return String(left.doctorId).localeCompare(String(right.doctorId));
      });
  }, [normalizedTrendRows, specializationFilter, minCasesNum]);

  const doctorTableRows =
    groupingMode === "month" ? monthlyGroupedRows : filteredDoctorRows;
  const doctorTableColumns =
    groupingMode === "month" ? q2MonthlyColumns : q2Columns;
  const doctorTableTitle =
    groupingMode === "month"
      ? "Doctor Recovery Month-wise Group"
      : "Doctor Recovery Performance Ranking";
  const doctorTableDescription =
    groupingMode === "month"
      ? `Filtered month rows: ${monthlyGroupedRows.length}. Month-wise doctor rows including Month + Doctor ID.`
      : `Filtered doctors: ${filteredDoctorRows.length}. Doctor ID-wise totals ranked by recovery with readmission context.`;

  const topPerformer = topRecoveryRows[0] ?? null;
  const needsAttention =
    filteredDoctorRows.length > 0
      ? [...filteredDoctorRows].sort((left, right) => {
          if (left.recoveryRatePct !== right.recoveryRatePct) {
            return left.recoveryRatePct - right.recoveryRatePct;
          }

          if (left.readmissionRatePct !== right.readmissionRatePct) {
            return right.readmissionRatePct - left.readmissionRatePct;
          }

          return right.totalCases - left.totalCases;
        })[0]
      : null;

  return (
    <div className="page-grid">
      <Header
        title="Doctor Analytics"
        subtitle="Doctor recovery intelligence with visuals and smart filters"
      />

      {loading ? (
        <p className="loading-note">Loading doctor analytics...</p>
      ) : null}

      <section className="card doctor-insights-card">
        <div className="card-head">
          <h3>Top Performer & Needs Attention</h3>
        </div>
        <div className="doctor-insights-grid">
          <article className="doctor-insight top">
            <h4>Top Performer</h4>
            <p>
              {topPerformer
                ? `Dr. ${topPerformer.doctorId} has highest recovery (${topPerformer.recoveryRatePct.toFixed(2)}%) with ${readmissionSeverity(topPerformer.readmissionRatePct)} readmissions (${topPerformer.readmissionRatePct.toFixed(2)}%).`
                : "No doctor data available for current filters."}
            </p>
          </article>
          <article className="doctor-insight attention">
            <h4>Needs Attention</h4>
            <p>
              {needsAttention
                ? `Dr. ${needsAttention.doctorId} needs attention with recovery ${needsAttention.recoveryRatePct.toFixed(2)}% and readmission ${needsAttention.readmissionRatePct.toFixed(2)}%.`
                : "No doctor data available for current filters."}
            </p>
          </article>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h3>Top 10 Doctors by Recovery Rate</h3>
        </div>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={topRecoveryChartRows}
              margin={{ top: 8, right: 8, left: 0, bottom: 52 }}
            >
              <CartesianGrid stroke="#dce9f4" strokeDasharray="4 4" />
              <XAxis
                dataKey="doctorLabel"
                angle={-20}
                textAnchor="end"
                interval={0}
                height={64}
                tick={{ fontSize: 10 }}
              />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(value, name) => {
                  if (name === "recoveryRatePct") {
                    return [formatPercent(value), "Recovery Rate"];
                  }

                  if (name === "totalCases") {
                    return [formatCount(value), "Total Cases"];
                  }

                  return [value, name];
                }}
              />
              <Bar
                dataKey="recoveryRatePct"
                fill="#0077b6"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card doctor-trend-card">
        <div className="card-head doctor-trend-head">
          <h3>Recovery Rate Over Time</h3>
          <label className="field doctor-id-field">
            Doctor ID
            <input
              value={doctorIdInput}
              onChange={(event) =>
                setDoctorIdInput(event.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder={
                defaultDoctorId ? `e.g. ${defaultDoctorId}` : "Enter Doctor ID"
              }
            />
          </label>
        </div>

        {showingFallbackDoctor ? (
          <p className="doctor-trend-note">
            No month-wise data found for Dr. {requestedDoctorId}. Showing Dr.{" "}
            {effectiveDoctorId} instead.
          </p>
        ) : effectiveDoctorId ? (
          <p className="doctor-trend-note">Showing Dr. {effectiveDoctorId}</p>
        ) : normalizedTrendRows.length > 0 ? (
          <p className="doctor-trend-note">
            Showing first available doctor trend from database.
          </p>
        ) : (
          <p className="doctor-trend-note">
            No month-wise doctor trend data available for this date range.
          </p>
        )}

        <div className="chart-box">
          {selectedDoctorTrend.length === 0 ? (
            <p className="query-empty">
              No trend data found for selected doctor ID in this date range.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={290}>
              <LineChart data={selectedDoctorTrend}>
                <CartesianGrid stroke="#dce9f4" strokeDasharray="4 4" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === "recoveryRatePct") {
                      return [formatPercent(value), "Recovery Rate"];
                    }

                    if (name === "readmissionRatePct") {
                      return [formatPercent(value), "Readmission Rate"];
                    }

                    return [value, name];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="recoveryRatePct"
                  stroke="#0077b6"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="readmissionRatePct"
                  stroke="#c94747"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <QueryTableCard
        title={doctorTableTitle}
        description={doctorTableDescription}
        rows={doctorTableRows}
        columns={doctorTableColumns}
        rowKey={(row) =>
          groupingMode === "month"
            ? `month-${row.monthLabel}-${row.doctorId}`
            : `${row.performanceRank}-${row.doctorId}`
        }
        toolbarControls={
          <>
            <label className="field query-inline-field">
              Grouping
              <select
                value={groupingMode}
                onChange={(event) => setGroupingMode(event.target.value)}
              >
                <option value="doctor">Doctor ID-wise Group</option>
                <option value="month">Month-wise Group</option>
              </select>
            </label>

            <label className="field query-inline-field">
              Specialization
              <select
                value={specializationFilter}
                onChange={(event) =>
                  setSpecializationFilter(event.target.value)
                }
              >
                <option value="all">All Specializations</option>
                {specializationOptions.map((specialization) => (
                  <option key={specialization} value={specialization}>
                    {specialization}
                  </option>
                ))}
              </select>
            </label>

            <label className="field query-inline-field">
              Minimum Cases
              <select
                value={minCases}
                onChange={(event) => setMinCases(event.target.value)}
              >
                <option value="0">0</option>
                <option value="30">30</option>
                <option value="50">50</option>
                <option value="80">80</option>
              </select>
            </label>
          </>
        }
      />
    </div>
  );
}
