// components/reports/OverviewDashboard.jsx - Executive Overview Dashboard
'use client';
import ExecutiveDashboard from './ExecutiveDashboard';

// This is an alias to maintain naming consistency
export default function OverviewDashboard({ finishedGoods, batches }) {
  return <ExecutiveDashboard products={finishedGoods} batches={batches} />;
}
