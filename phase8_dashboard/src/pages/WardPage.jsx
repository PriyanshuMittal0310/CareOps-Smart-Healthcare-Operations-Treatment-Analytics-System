import { useMemo, useState } from "react";
import {
  Header,
  Kpi,
  QueryTableCard,
  formatCount,
  formatPercent,
  q3GroupedColumns,
  q3MonthlyColumns,
  toNumeric,
  utilizationBandFromPct,
  wardHeatColor,
  wardHeatTextColor,
} from "./shared";

export default function WardPage({ analyticsQueries, loading }) {
  const wardRows = analyticsQueries?.q3WardOverUtilization ?? [];
  const [wardTypeFilter, setWardTypeFilter] = useState("all");
  const [utilizationBandFilter, setUtilizationBandFilter] = useState("all");
  const [viewMode, setViewMode] = useState("month");

  const normalizedRows = useMemo(
    () =>
      wardRows.map((row) => {
        const utilizationPct = toNumeric(row.utilizationPct) ?? 0;

        return {
          ...row,
          monthLabel: `${row.yearNum}-${String(row.monthNum).padStart(2, "0")}`,
          capacity: toNumeric(row.capacity) ?? 0,
          monthOccupiedBedDays: toNumeric(row.monthOccupiedBedDays) ?? 0,
          utilizationPct,
          utilizationBand:
            row.utilizationBand || utilizationBandFromPct(utilizationPct),
        };
      }),
    [wardRows],
  );

  const wardTypeOptions = useMemo(
    () =>
      [
        ...new Set(normalizedRows.map((row) => row.wardType).filter(Boolean)),
      ].sort((left, right) => String(left).localeCompare(String(right))),
    [normalizedRows],
  );

  const utilizationBandOptions = [
    "Critical Over-Utilization",
    "High Utilization",
    "Moderate Utilization",
    "Low Utilization",
  ];

  const baseFilteredRows = useMemo(
    () =>
      normalizedRows.filter(
        (row) => wardTypeFilter === "all" || row.wardType === wardTypeFilter,
      ),
    [normalizedRows, wardTypeFilter],
  );

  const monthlyRows = useMemo(() => {
    const filtered = baseFilteredRows.filter(
      (row) =>
        utilizationBandFilter === "all" ||
        row.utilizationBand === utilizationBandFilter,
    );

    return [...filtered].sort((left, right) => {
      if (left.utilizationPct !== right.utilizationPct) {
        return right.utilizationPct - left.utilizationPct;
      }

      if (left.wardName !== right.wardName) {
        return String(left.wardName).localeCompare(String(right.wardName));
      }

      return String(left.monthLabel).localeCompare(String(right.monthLabel));
    });
  }, [baseFilteredRows, utilizationBandFilter]);

  const groupedWardRows = useMemo(() => {
    const grouped = new Map();

    baseFilteredRows.forEach((row) => {
      const key = `${row.wardId}`;
      const current = grouped.get(key) || {
        wardId: row.wardId,
        wardName: row.wardName,
        wardType: row.wardType,
        capacity: row.capacity,
        totalOccupiedBedDays: 0,
        totalUtilization: 0,
        rowCount: 0,
        peakUtilization: 0,
        months: new Set(),
      };

      current.capacity = Math.max(current.capacity, row.capacity);
      current.totalOccupiedBedDays += row.monthOccupiedBedDays;
      current.totalUtilization += row.utilizationPct;
      current.rowCount += 1;
      current.peakUtilization = Math.max(
        current.peakUtilization,
        row.utilizationPct,
      );
      current.months.add(row.monthLabel);
      grouped.set(key, current);
    });

    const rows = [...grouped.values()].map((row) => {
      const avgUtilization =
        row.rowCount > 0 ? row.totalUtilization / row.rowCount : 0;

      return {
        wardId: row.wardId,
        wardName: row.wardName,
        wardType: row.wardType,
        capacity: row.capacity,
        monthsTracked: row.months.size,
        totalOccupiedBedDays: row.totalOccupiedBedDays,
        avgUtilization,
        peakUtilization: row.peakUtilization,
        avgUtilizationBand: utilizationBandFromPct(avgUtilization),
      };
    });

    const bandFilteredRows = rows.filter(
      (row) =>
        utilizationBandFilter === "all" ||
        row.avgUtilizationBand === utilizationBandFilter,
    );

    return bandFilteredRows.sort((left, right) => {
      if (left.avgUtilization !== right.avgUtilization) {
        return right.avgUtilization - left.avgUtilization;
      }

      return String(left.wardName).localeCompare(String(right.wardName));
    });
  }, [baseFilteredRows, utilizationBandFilter]);

  const heatmapRows = useMemo(
    () =>
      baseFilteredRows.filter(
        (row) =>
          utilizationBandFilter === "all" ||
          row.utilizationBand === utilizationBandFilter,
      ),
    [baseFilteredRows, utilizationBandFilter],
  );

  const heatmapMonths = useMemo(
    () => [...new Set(heatmapRows.map((row) => row.monthLabel))].sort(),
    [heatmapRows],
  );

  const heatmapWards = useMemo(
    () =>
      [...new Map(heatmapRows.map((row) => [row.wardId, row])).values()].sort(
        (left, right) =>
          String(left.wardName).localeCompare(String(right.wardName)),
      ),
    [heatmapRows],
  );

  const heatmapMatrix = useMemo(() => {
    const matrix = new Map();

    heatmapRows.forEach((row) => {
      const key = `${row.wardId}::${row.monthLabel}`;
      const current = matrix.get(key) || { sum: 0, count: 0 };
      current.sum += row.utilizationPct;
      current.count += 1;
      matrix.set(key, current);
    });

    return matrix;
  }, [heatmapRows]);

  function getHeatmapValue(wardId, monthLabel) {
    const item = heatmapMatrix.get(`${wardId}::${monthLabel}`);
    if (!item || item.count === 0) return null;
    return item.sum / item.count;
  }

  const kpiRows = heatmapRows;
  const avgUtilization =
    kpiRows.length > 0
      ? kpiRows.reduce((sum, row) => sum + row.utilizationPct, 0) /
        kpiRows.length
      : null;

  const wardAverages = useMemo(() => {
    const grouped = new Map();

    kpiRows.forEach((row) => {
      const key = `${row.wardId}`;
      const current = grouped.get(key) || {
        wardId: row.wardId,
        wardName: row.wardName,
        totalUtilization: 0,
        count: 0,
      };

      current.totalUtilization += row.utilizationPct;
      current.count += 1;
      grouped.set(key, current);
    });

    return [...grouped.values()].map((row) => ({
      wardId: row.wardId,
      wardName: row.wardName,
      avgUtilization: row.count > 0 ? row.totalUtilization / row.count : 0,
    }));
  }, [kpiRows]);

  const mostOverutilizedWard =
    wardAverages.length > 0
      ? [...wardAverages].sort(
          (left, right) => right.avgUtilization - left.avgUtilization,
        )[0]
      : null;
  const mostUnderutilizedWard =
    wardAverages.length > 0
      ? [...wardAverages].sort(
          (left, right) => left.avgUtilization - right.avgUtilization,
        )[0]
      : null;

  const totalCapacityBeds = useMemo(
    () =>
      [
        ...new Map(kpiRows.map((row) => [row.wardId, row.capacity])).values(),
      ].reduce((sum, capacity) => sum + (toNumeric(capacity) ?? 0), 0),
    [kpiRows],
  );
  const totalUsedBedDays = useMemo(
    () =>
      kpiRows.reduce(
        (sum, row) => sum + (toNumeric(row.monthOccupiedBedDays) ?? 0),
        0,
      ),
    [kpiRows],
  );

  const tableRows = viewMode === "ward" ? groupedWardRows : monthlyRows;
  const tableColumns =
    viewMode === "ward" ? q3GroupedColumns : q3MonthlyColumns;
  const tableDescription =
    viewMode === "ward"
      ? "Grouped ward utilization view aggregated across selected months."
      : "Monthly ward-level utilization records with applied filters.";

  return (
    <div className="page-grid">
      <Header
        title="Ward Analytics"
        subtitle="Ward utilization intelligence with KPI summary and heatmap"
      />

      {loading ? (
        <p className="loading-note">Loading ward analytics...</p>
      ) : null}

      <section className="kpi-grid ward-kpi-grid">
        <Kpi
          label="Avg Utilization"
          value={
            avgUtilization === null ? "n/a" : formatPercent(avgUtilization)
          }
          tone="blue"
        />
        <Kpi
          label="Most Overutilized Ward"
          value={
            mostOverutilizedWard
              ? `${mostOverutilizedWard.wardName} (${formatPercent(mostOverutilizedWard.avgUtilization)})`
              : "n/a"
          }
          tone="danger"
        />
        <Kpi
          label="Most Underutilized Ward"
          value={
            mostUnderutilizedWard
              ? `${mostUnderutilizedWard.wardName} (${formatPercent(mostUnderutilizedWard.avgUtilization)})`
              : "n/a"
          }
          tone="teal"
        />
        <Kpi
          label="Bed Capacity vs Used"
          value={`${formatCount(totalCapacityBeds)} beds / ${formatCount(totalUsedBedDays)} bed-days`}
          tone="slate"
        />
      </section>

      <section className="card ward-heatmap-card">
        <div className="card-head">
          <h3>Utilization Heatmap (Months x Wards)</h3>
          <span className="query-count">
            {heatmapMonths.length} months x {heatmapWards.length} wards
          </span>
        </div>
        <div className="ward-heatmap-legend">
          <span>Low</span>
          <div className="ward-heatmap-gradient" />
          <span>High</span>
        </div>
        <div className="ward-heatmap-scroll">
          <table className="ward-heatmap-table">
            <thead>
              <tr>
                <th>Ward</th>
                {heatmapMonths.map((monthLabel) => (
                  <th key={monthLabel}>{monthLabel}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapWards.map((ward) => (
                <tr key={`heat-ward-${ward.wardId}`}>
                  <td className="ward-heatmap-rowhead">{ward.wardName}</td>
                  {heatmapMonths.map((monthLabel) => {
                    const utilizationValue = getHeatmapValue(
                      ward.wardId,
                      monthLabel,
                    );

                    return (
                      <td key={`heat-${ward.wardId}-${monthLabel}`}>
                        <div
                          className={`ward-heat-cell ${utilizationValue === null ? "empty" : ""}`}
                          style={{
                            backgroundColor: wardHeatColor(utilizationValue),
                            color: wardHeatTextColor(utilizationValue),
                          }}
                          title={
                            utilizationValue === null
                              ? `${ward.wardName} - ${monthLabel}: no data`
                              : `${ward.wardName} - ${monthLabel}: ${utilizationValue.toFixed(2)}%`
                          }
                        >
                          {utilizationValue === null
                            ? "-"
                            : `${utilizationValue.toFixed(1)}%`}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <QueryTableCard
        title="Ward Over-Utilization Analysis"
        description={tableDescription}
        rows={tableRows}
        columns={tableColumns}
        rowKey={(row) =>
          viewMode === "ward"
            ? `ward-${row.wardId}`
            : `${row.monthLabel}-${row.wardId}`
        }
        toolbarControls={
          <>
            <label className="field query-inline-field">
              Ward Type
              <select
                value={wardTypeFilter}
                onChange={(event) => setWardTypeFilter(event.target.value)}
              >
                <option value="all">All Ward Types</option>
                {wardTypeOptions.map((wardType) => (
                  <option key={wardType} value={wardType}>
                    {wardType}
                  </option>
                ))}
              </select>
            </label>

            <label className="field query-inline-field">
              Utilization Band
              <select
                value={utilizationBandFilter}
                onChange={(event) =>
                  setUtilizationBandFilter(event.target.value)
                }
              >
                <option value="all">All Bands</option>
                {utilizationBandOptions.map((band) => (
                  <option key={band} value={band}>
                    {band}
                  </option>
                ))}
              </select>
            </label>

            <label className="field query-inline-field">
              Grouping
              <select
                value={viewMode}
                onChange={(event) => setViewMode(event.target.value)}
              >
                <option value="month">Monthly Rows</option>
                <option value="ward">Group by Ward</option>
              </select>
            </label>
          </>
        }
      />
    </div>
  );
}
