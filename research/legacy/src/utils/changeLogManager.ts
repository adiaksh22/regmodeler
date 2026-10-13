import { TCDSChangeLog } from '../types/tcds';

const STORAGE_KEY = 'tcds_change_logs';

export const getChangeLogs = (): TCDSChangeLog[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const addChangeLog = (log: TCDSChangeLog): void => {
  const logs = getChangeLogs();
  logs.push(log);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
};

export const updateChangeLog = (id: string, updates: Partial<TCDSChangeLog>): void => {
  const logs = getChangeLogs();
  const index = logs.findIndex(log => log.id === id);
  if (index !== -1) {
    logs[index] = { ...logs[index], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  }
};

export const generateContentHash = async (content: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
};
