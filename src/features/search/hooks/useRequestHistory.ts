import { useState, useEffect, useCallback } from 'react';
import { RFQRequest } from '@/shared/types/rfq';

const STORAGE_KEY = 'rfq_request_history';

function loadHistory(): RFQRequest[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return parsed.map((r: RFQRequest) => ({
      ...r,
      created_at: new Date(r.created_at),
      sent_at: r.sent_at ? new Date(r.sent_at) : undefined,
    }));
  } catch {
    return [];
  }
}

function saveHistory(history: RFQRequest[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function useRequestHistory() {
  const [history, setHistory] = useState<RFQRequest[]>(() => loadHistory());

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  const addRequest = useCallback((request: RFQRequest) => {
    setHistory((prev) => {
      const existing = prev.findIndex((r) => r.id === request.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = request;
        return updated;
      }
      return [request, ...prev];
    });
  }, []);

  const updateRequest = useCallback((id: string, updates: Partial<RFQRequest>) => {
    setHistory((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  }, []);

  const getRequest = useCallback(
    (id: string) => history.find((r) => r.id === id),
    [history]
  );

  return { history, addRequest, updateRequest, getRequest };
}
