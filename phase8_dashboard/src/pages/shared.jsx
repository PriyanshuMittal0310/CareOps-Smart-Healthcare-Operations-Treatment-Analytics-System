import { useEffect, useMemo, useState } from "react";

export function Header({ title, subtitle }) {
  return (
    <section className="page-header">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </section>
  );
}

export function Kpi({ label, value, tone }) {
  return (
    <article className={`kpi-card ${tone}`}>
      <p>{label}</p>
      <h3>{value}</h3>
    </article>
  );
}

export function toNumeric(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function formatCount(value) {
  const num = toNumeric(value);
  return num === null ? "n/a" : num.toLocaleString();
}

export function formatMoney(value) {
  const num = toNumeric(value);
  return num === null
    ? "n/a"
    : num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

export function formatPercent(value) {
  const num = toNumeric(value);
  return num === null ? "n/a" : `${num.toFixed(2)}%`;
}

export function utilizationBandClass(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function readmissionSeverity(value) {
  const rate = toNumeric(value) ?? 0;
  if (rate >= 25) return "high";
  if (rate >= 15) return "moderate";
  return "low";
}

export function utilizationBandFromPct(utilizationPct) {
  if (utilizationPct >= 90) return "Critical Over-Utilization";
  if (utilizationPct >= 75) return "High Utilization";
  if (utilizationPct >= 50) return "Moderate Utilization";
  return "Low Utilization";
}

export function wardHeatColor(utilizationPct) {
  if (utilizationPct === null || utilizationPct === undefined) return "#eff4f9";

  const clamped = Math.max(0, Math.min(100, utilizationPct));
  const hue = Math.round(210 - clamped * 2);
  const lightness = Math.max(38, Math.round(95 - clamped * 0.45));
  return `hsl(${hue} 85% ${lightness}%)`;
}

export function wardHeatTextColor(utilizationPct) {
  if (utilizationPct === null || utilizationPct === undefined) return "#6b8295";
  return utilizationPct >= 67 ? "#ffffff" : "#0f2c44";
}

export const Q1_DEFAULT_VISIBLE_COLUMNS = [
  "diseaseName",
  "totalTreatmentSpend",
  "totalCases",
];

export function buildQ1DiseaseRows(rawRows) {
  const diseaseMap = new Map();

  rawRows.forEach((row) => {
    const diseaseName = row.diseaseName || "Unknown Disease";
    const totalCases = toNumeric(row.totalCases) ?? 0;
    const totalTreatmentSpend = toNumeric(row.totalTreatmentSpend) ?? 0;
    const totalBedDays = toNumeric(row.totalBedDays) ?? 0;

    const current = diseaseMap.get(diseaseName) || {
      diseaseName,
      totalCases: 0,
      totalTreatmentSpend: 0,
      totalBedDays: 0,
    };

    current.totalCases += totalCases;
    current.totalTreatmentSpend += totalTreatmentSpend;
    current.totalBedDays += totalBedDays;
    diseaseMap.set(diseaseName, current);
  });

  return [...diseaseMap.values()].map((row) => ({
    diseaseName: row.diseaseName,
    totalCases: row.totalCases,
    totalTreatmentSpend: row.totalTreatmentSpend,
    totalBedDays: row.totalBedDays,
  }));
}

export function sortQ1Rows(rows, sortKey, sortDirection) {
  const direction = sortDirection === "asc" ? 1 : -1;

  return [...rows].sort((left, right) => {
    const leftValue = left[sortKey];
    const rightValue = right[sortKey];
    const leftNumber = toNumeric(leftValue);
    const rightNumber = toNumeric(rightValue);

    if (
      leftNumber !== null &&
      rightNumber !== null &&
      leftNumber !== rightNumber
    ) {
      return (leftNumber - rightNumber) * direction;
    }

    return (
      String(leftValue ?? "").localeCompare(String(rightValue ?? "")) *
      direction
    );
  });
}

export const q1Columns = [
  { key: "diseaseName", label: "Disease" },
  {
    key: "totalTreatmentSpend",
    label: "Total Spend",
    render: formatMoney,
  },
  { key: "totalCases", label: "Total Cases", render: formatCount },
  { key: "totalBedDays", label: "Total Bed Days", render: formatCount },
];

export const q1MonthlyColumns = [
  { key: "monthLabel", label: "Month" },
  { key: "diseaseName", label: "Disease" },
  {
    key: "totalTreatmentSpend",
    label: "Total Spend",
    render: formatMoney,
  },
  { key: "totalCases", label: "Total Cases", render: formatCount },
  { key: "totalBedDays", label: "Total Bed Days", render: formatCount },
];

export const q2Columns = [
  { key: "performanceRank", label: "Rank" },
  { key: "doctorId", label: "Doctor ID" },
  { key: "specialization", label: "Specialization" },
  { key: "department", label: "Department" },
  { key: "totalCases", label: "Total Cases", render: formatCount },
  { key: "recoveredCases", label: "Recovered", render: formatCount },
  { key: "readmittedCases", label: "Readmitted", render: formatCount },
  { key: "recoveryRatePct", label: "Recovery Rate", render: formatPercent },
  {
    key: "readmissionRatePct",
    label: "Readmission Rate",
    render: formatPercent,
  },
  {
    key: "weightedAvgTreatmentCost",
    label: "Weighted Avg Cost",
    render: formatMoney,
  },
];

export const q2MonthlyColumns = [
  { key: "monthLabel", label: "Month" },
  { key: "doctorId", label: "Doctor ID" },
  { key: "specialization", label: "Specialization" },
  { key: "department", label: "Department" },
  { key: "totalCases", label: "Total Cases", render: formatCount },
  { key: "recoveredCases", label: "Recovered", render: formatCount },
  { key: "readmittedCases", label: "Readmitted", render: formatCount },
  { key: "recoveryRatePct", label: "Recovery Rate", render: formatPercent },
  {
    key: "readmissionRatePct",
    label: "Readmission Rate",
    render: formatPercent,
  },
];

export const q3MonthlyColumns = [
  { key: "monthLabel", label: "Month" },
  { key: "wardName", label: "Ward Name" },
  { key: "wardType", label: "Ward Type" },
  { key: "capacity", label: "Capacity", render: formatCount },
  {
    key: "monthOccupiedBedDays",
    label: "Occupied Bed Days",
    render: formatCount,
  },
  { key: "utilizationPct", label: "Utilization", render: formatPercent },
  {
    key: "utilizationBand",
    label: "Band",
    render: (value) => (
      <span className={`utilization-badge ${utilizationBandClass(value)}`}>
        {value || "n/a"}
      </span>
    ),
  },
];

export const q3GroupedColumns = [
  { key: "wardName", label: "Ward Name" },
  { key: "wardType", label: "Ward Type" },
  { key: "capacity", label: "Capacity", render: formatCount },
  { key: "monthsTracked", label: "Months Tracked", render: formatCount },
  {
    key: "totalOccupiedBedDays",
    label: "Total Occupied Bed Days",
    render: formatCount,
  },
  {
    key: "avgUtilization",
    label: "Avg Utilization",
    render: formatPercent,
  },
  {
    key: "peakUtilization",
    label: "Peak Utilization",
    render: formatPercent,
  },
  {
    key: "avgUtilizationBand",
    label: "Avg Utilization Band",
    render: (value) => (
      <span className={`utilization-badge ${utilizationBandClass(value)}`}>
        {value || "n/a"}
      </span>
    ),
  },
];

export const q5Columns = [
  { key: "diseaseName", label: "Disease" },
  { key: "totalCases", label: "Total Cases", render: formatCount },
  { key: "readmittedCases", label: "Readmitted", render: formatCount },
  { key: "recoveredCases", label: "Recovered", render: formatCount },
  {
    key: "readmissionRatePct",
    label: "Readmission Rate",
    render: formatPercent,
  },
  { key: "recoveryRatePct", label: "Recovery Rate", render: formatPercent },
];

export const q5MonthlyColumns = [
  { key: "monthLabel", label: "Month" },
  { key: "diseaseName", label: "Disease" },
  { key: "totalCases", label: "Total Cases", render: formatCount },
  { key: "readmittedCases", label: "Readmitted", render: formatCount },
  { key: "recoveredCases", label: "Recovered", render: formatCount },
  {
    key: "readmissionRatePct",
    label: "Readmission Rate",
    render: formatPercent,
  },
  { key: "recoveryRatePct", label: "Recovery Rate", render: formatPercent },
];

export const readmissionDonutColors = [
  "#c94747",
  "#0077b6",
  "#00b4d8",
  "#4f6d86",
  "#90e0ef",
  "#6a8ba2",
  "#2b4f6d",
  "#d67272",
];

export function QueryTableCard({
  title,
  description,
  rows,
  columns,
  rowKey,
  searchTerm,
  onSearchTermChange,
  searchPlaceholder,
  toolbarControls,
}) {
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [sortState, setSortState] = useState(() => ({
    key: columns[0]?.key ?? "",
    direction: "asc",
  }));

  const effectiveSearchTerm =
    typeof searchTerm === "string" ? searchTerm : localSearchTerm;
  const setEffectiveSearchTerm = onSearchTermChange ?? setLocalSearchTerm;

  useEffect(() => {
    if (!columns.some((column) => column.key === sortState.key)) {
      setSortState({ key: columns[0]?.key ?? "", direction: "asc" });
    }
  }, [columns, sortState.key]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = effectiveSearchTerm.trim().toLowerCase();
    if (!normalizedSearch) return rows;

    return rows.filter((row) =>
      columns.some((column) =>
        String(row[column.key] ?? "")
          .toLowerCase()
          .includes(normalizedSearch),
      ),
    );
  }, [rows, columns, effectiveSearchTerm]);

  const sortedRows = useMemo(() => {
    if (!sortState.key) return filteredRows;

    return [...filteredRows].sort((left, right) => {
      const leftValue = left[sortState.key];
      const rightValue = right[sortState.key];
      const leftNumber = toNumeric(leftValue);
      const rightNumber = toNumeric(rightValue);

      if (
        leftNumber !== null &&
        rightNumber !== null &&
        leftNumber !== rightNumber
      ) {
        return sortState.direction === "asc"
          ? leftNumber - rightNumber
          : rightNumber - leftNumber;
      }

      const stringCompare = String(leftValue ?? "").localeCompare(
        String(rightValue ?? ""),
        undefined,
        { numeric: true, sensitivity: "base" },
      );

      return sortState.direction === "asc" ? stringCompare : -stringCompare;
    });
  }, [filteredRows, sortState]);

  function onSortColumn(columnKey) {
    setSortState((previous) => {
      if (previous.key !== columnKey) {
        return { key: columnKey, direction: "asc" };
      }

      return {
        key: columnKey,
        direction: previous.direction === "asc" ? "desc" : "asc",
      };
    });
  }

  const countLabel =
    effectiveSearchTerm.trim() === ""
      ? `${rows.length} rows`
      : `${sortedRows.length} of ${rows.length} rows`;

  return (
    <section className="card table-card">
      <div className="card-head query-head">
        <div>
          <h3>{title}</h3>
          <p className="query-desc">{description}</p>
        </div>
        <span className="query-count">{countLabel}</span>
      </div>

      <div className="query-tools">
        <div className="query-tools-row">
          <label className="field query-search-field">
            Search in table
            <input
              type="search"
              value={effectiveSearchTerm}
              onChange={(event) => setEffectiveSearchTerm(event.target.value)}
              placeholder={
                searchPlaceholder || "Type disease, doctor, ward, or metric..."
              }
            />
          </label>

          {toolbarControls ? (
            <div className="query-filter-inline">{toolbarControls}</div>
          ) : null}
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>
                  <button
                    type="button"
                    className="table-sort-btn"
                    onClick={() => onSortColumn(column.key)}
                    aria-label={`Sort by ${column.label}`}
                  >
                    <span>{column.label}</span>
                    <span
                      className={`table-sort-indicator ${
                        sortState.key === column.key ? "active" : ""
                      }`}
                    >
                      {sortState.key === column.key
                        ? sortState.direction === "asc"
                          ? "▲"
                          : "▼"
                        : "↕"}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td className="query-empty" colSpan={columns.length}>
                  {effectiveSearchTerm.trim()
                    ? "No rows match your search text."
                    : "No rows for selected date range."}
                </td>
              </tr>
            ) : (
              sortedRows.map((row, index) => (
                <tr
                  key={
                    rowKey
                      ? rowKey(row, index)
                      : `${title}-${String(index).padStart(4, "0")}`
                  }
                >
                  {columns.map((column) => {
                    let value = row[column.key];
                    if (column.render) {
                      value = column.render(value, row, index);
                    } else if (
                      value === null ||
                      value === undefined ||
                      value === ""
                    ) {
                      value = "n/a";
                    }

                    return <td key={column.key}>{value}</td>;
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
