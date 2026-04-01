import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Header, Kpi } from "./shared";

export default function DashboardPage({ overview, trend, loading, meta }) {
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
