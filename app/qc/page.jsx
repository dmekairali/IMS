// app/qc/page.jsx - QC upload link page
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import QCUploadPage from '@/components/qc/QCUploadPage';

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : `${value || ''}`.trim();
}

function getNormalizedHeaders(headers) {
  return headers.map((h) => normalizeText(h).toLowerCase().trim());
}

function getUserMatchValues(user) {
  if (!user) return [];
  const values = [
    user.employeeId,
    user.name,
    user.email,
  ];
  return values
    .map((value) => normalizeText(value).toLowerCase())
    .filter(Boolean);
}

function filterTasksForCurrentUser(tasks, headers, user) {
  const rawHeaders = Array.isArray(headers) ? headers : [];
  if (!user || tasks.length === 0) return tasks;

  const normalizedHeaders = getNormalizedHeaders(rawHeaders);
  const assigneeCandidates = [
    'employee id',
    'emp id',
    'empid',
    'assigned to',
    'assignee',
    'assignee name',
    'qc person',
    'qc user',
    'qc employee id',
    'user',
    'user id',
  ];

  const assigneeIndexes = normalizedHeaders
    .map((header, index) => ({ header, index }))
    .filter(({ header }) => assigneeCandidates.includes(header))
    .map(({ index }) => index);

  // If sheet doesn't have any assignee-like columns, return all tasks.
  if (assigneeIndexes.length === 0) {
    return tasks;
  }

  const userValues = getUserMatchValues(user);
  if (userValues.length === 0) return tasks;

  return tasks.filter((task) => {
    return assigneeIndexes.some((index) => {
      const value = normalizeText(task[rawHeaders[index]]).toLowerCase();
      return userValues.some((token) => value && (value === token || value.includes(token)));
    });
  });
}

export default function QCPage() {
  const { user } = useAuth();
  const qcUploadUrl = user?.qcUploadUrl || '';

  const [tasks, setTasks] = useState([]);
  const [rawTasks, setRawTasks] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadTasks = async () => {
    const isRefresh = rawTasks.length > 0;
    if (isRefresh) setRefreshing(true);

    try {
      setError('');
      const response = await fetch('/api/qc/list', {
        cache: 'no-store',
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data?.error || 'Failed to load QC tasks');
      }

      const qcRows = data.tasks || [];
      setHeaders(Array.isArray(data.headers) ? data.headers : []);
      setRawTasks(qcRows);
      setTasks(filterTasksForCurrentUser(qcRows, data.headers || [], user));
    } catch (err) {
      console.error('Error loading QC tasks:', err);
      setError(err.message || 'Unable to load QC tasks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    setTasks(filterTasksForCurrentUser(rawTasks, headers, user));
  }, [user, rawTasks, headers]);

  return (
    <QCUploadPage
      qcUploadUrl={qcUploadUrl}
      tasks={tasks}
      headers={headers}
      loading={loading}
      error={error}
      refreshing={refreshing}
      onRefresh={loadTasks}
    />
  );
}
