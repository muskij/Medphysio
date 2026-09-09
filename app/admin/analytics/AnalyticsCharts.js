"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function AnalyticsCharts({ perCourse }) {
  if (!perCourse.length) {
    return <p style={{ color: "#8fa2a5" }}>No data yet &mdash; once students enroll and take quizzes, charts will appear here.</p>;
  }

  return (
    <div>
      <div style={{ height: 280, marginBottom: 30 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#526a6f", marginBottom: 8 }}>Students started</p>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={perCourse}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef4f3" />
            <XAxis dataKey="title" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="enrollments" fill="#0b9b96" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ height: 280 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#526a6f", marginBottom: 8 }}>Average quiz score (%)</p>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={perCourse}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef4f3" />
            <XAxis dataKey="title" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="avg_quiz_pct" fill="#ff8b62" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <table className="admin-table" style={{ marginTop: 30 }}>
        <thead>
          <tr>
            <th>Course</th>
            <th>Enrollments</th>
            <th>Avg. quiz score</th>
            <th>Lessons completed</th>
          </tr>
        </thead>
        <tbody>
          {perCourse.map((c) => (
            <tr key={c.id}>
              <td>{c.title}</td>
              <td>{c.enrollments}</td>
              <td>{c.avg_quiz_pct}%</td>
              <td>{c.completions}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
