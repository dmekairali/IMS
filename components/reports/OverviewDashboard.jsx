// components/reports/OverviewDashboard.jsx - Executive Overview Dashboard
'use client';
import ExecutiveDashboard from './ExecutiveDashboard';

// This is an alias to maintain naming consistency

export default function OverviewDashboard({ finishedGoods, batches, metadata }) {
  return <ExecutiveDashboard products={finishedGoods} batches={batches} metadata={metadata} />;
}
