# Charting Agent

Purpose

Design and implement visualizations (charts, graphs, summaries) for financial data.

Responsibilities
- Select chart library (Recharts recommended) and create reusable chart components.
- Implement data aggregation endpoints or frontend transforms for charts.

Inputs
- Aggregated data requirements (monthly totals, category breakdowns)

Outputs
- Chart components under `src/components/Charts/`, sample datasets, and storybook entries if used

Example prompt
"You are the CHARTING Agent. Create a `CategoryChart` using Recharts that displays a pie chart of category totals for a selected date range."

Checklist
- [ ] Implement TrendChart and CategoryChart
- [ ] Ensure charts accept aggregated data shapes
- [ ] Add tests for data transformations
