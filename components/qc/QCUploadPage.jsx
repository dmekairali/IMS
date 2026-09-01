'use client';

import { useMemo, useState } from 'react';

function normalize(value) {
  return typeof value === 'string' ? value.trim() : `${value || ''}`.trim();
}

function isLikelyUrl(value) {
  return /^https?:\/\/|^www\./i.test(normalize(value));
}

function getDisplayUrl(task, fallbackQcUploadUrl) {
  const direct = normalize(task.uploadUrl);
  if (isLikelyUrl(direct)) return direct;

  const derived = normalize(task._derivedUploadUrl);
  if (isLikelyUrl(derived)) return derived;

  if (isLikelyUrl(fallbackQcUploadUrl)) return normalize(fallbackQcUploadUrl);

  return '';
}

function getTaskRows(task, headers, fallbackUrl) {
  const rows = [];
  headers.forEach((header) => {
    const value = normalize(task[header]);
    if (value) rows.push({ label: header, value });
  });

  const uploadUrl = getDisplayUrl(task, fallbackUrl);
  const hasUploadRow = rows.some(
    (row) => row.label.toLowerCase().includes('upload') && isLikelyUrl(row.value)
  );

  if (uploadUrl && !hasUploadRow) {
    rows.push({ label: 'Upload Form URL', value: uploadUrl });
  }

  return rows;
}

function getTaskValue(task, names) {
  const key = names.find((name) => normalize(task[name]));
  return key ? normalize(task[key]) : '-';
}

function TaskCard({ task, headers, fallbackQcUploadUrl }) {
  const [copied, setCopied] = useState(false);
  const uploadUrl = getDisplayUrl(task, fallbackQcUploadUrl);
  const title = task.title || `Row ${task.rowIndex || ''}`;
  const client = getTaskValue(task, ['Name of Client', 'Client Name', 'Customer Name']);
  const orderId = getTaskValue(task, ['Order ID', 'Oder ID', 'Invoice No']);
  const invoice = getTaskValue(task, ['Invoice No', 'Invoice Number']);
  const status = getTaskValue(task, ['QC Status', 'Status']);

  const handleCopy = async () => {
    if (!uploadUrl) return;
    try {
      await navigator.clipboard.writeText(uploadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 sm:px-4">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] sm:grid-cols-[auto_minmax(180px,1.5fr)_minmax(120px,1fr)_minmax(90px,.7fr)_auto] gap-x-3 gap-y-2 items-center">
        <div className="text-xs font-semibold text-gray-500 whitespace-nowrap">#{task.rowIndex}</div>

        <div className="min-w-0">
          <div className="font-semibold text-gray-800 text-sm truncate" title={client}>{client}</div>
          <div className="text-xs text-gray-500 truncate" title={title}>{title}</div>
        </div>

        <div className="hidden sm:block min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-gray-400">Order</div>
          <div className="text-sm text-gray-700 truncate" title={orderId}>{orderId}</div>
        </div>

        <div className="hidden sm:block min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-gray-400">Invoice</div>
          <div className="text-sm text-gray-700 truncate" title={invoice}>{invoice}</div>
        </div>

        <div className="hidden sm:block">
          <span className="inline-flex rounded-full bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-700 whitespace-nowrap">
            {status}
          </span>
        </div>

        <div className="col-start-2 sm:col-start-auto flex gap-2">
          {uploadUrl ? (
            <>
              <a
                href={uploadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md bg-teal-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 whitespace-nowrap"
              >
                Open Form
              </a>
              <button
                onClick={handleCopy}
                className="hidden sm:inline-flex items-center justify-center rounded-md bg-gray-800 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-gray-900 whitespace-nowrap"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </>
          ) : (
            <span className="text-xs text-amber-700 whitespace-nowrap">No form URL</span>
          )}
        </div>
      </div>

      <div className="mt-1 flex gap-3 text-xs text-gray-500 sm:hidden">
        <span>Order: {orderId}</span>
        <span>Status: {status}</span>
      </div>
    </div>
  );
}

export default function QCUploadPage({
  qcUploadUrl,
  tasks,
  headers,
  loading,
  error,
  refreshing,
  onRefresh,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTasks = useMemo(() => {
    if (!tasks?.length) return [];
    const q = normalize(searchQuery).toLowerCase();
    if (!q) return tasks;

    return tasks.filter((task) => {
      return normalize(Object.values(task).join(' ')).toLowerCase().includes(q);
    });
  }, [tasks, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="mx-auto max-w-3xl p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="mb-4">
            <h1 className="text-lg sm:text-xl font-bold text-gray-800">QC Tasks</h1>
            <p className="text-sm text-gray-600 mt-1">
              One row = one task from the QC sheet. Open the form link per row.
            </p>
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search task row..."
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />

          {(loading || refreshing) && (
            <div className="text-center text-sm text-gray-500 py-6">Loading QC tasks...</div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 my-4">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-3 mt-4">
              {filteredTasks.length === 0 ? (
                <div className="text-center text-sm text-gray-500 py-8">No task rows found in QC tab.</div>
              ) : (
                filteredTasks.map((task) => (
                  <TaskCard
                    key={`${task.rowIndex}-${task.title}`}
                    task={task}
                    headers={headers}
                    fallbackQcUploadUrl={qcUploadUrl}
                  />
                ))
              )}
            </div>
          )}

          <p className="text-xs text-gray-500 mt-4 leading-relaxed">
            Global UserAccess URL is used only when row-level URL is missing.
          </p>
        </div>
      </div>

      <button
        onClick={onRefresh}
        disabled={loading || refreshing}
        className="fixed right-4 bottom-24 z-10 bg-teal-600 text-white p-4 rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Refresh QC tasks"
      >
        <svg
          className={`w-6 h-6 ${(loading || refreshing) ? 'animate-spin' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );
}
