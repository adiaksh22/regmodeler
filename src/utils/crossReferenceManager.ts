import { CrossRefGroup } from '../types/crossReference';

const CROSS_REF_KEY = 'tcds_cross_references';

export const listGroups = (): CrossRefGroup[] => {
  const data = localStorage.getItem(CROSS_REF_KEY);
  return data ? JSON.parse(data) : [];
};

export const getGroup = (groupId: string): CrossRefGroup | null => {
  const groups = listGroups();
  return groups.find(g => g.group_id === groupId) || null;
};

export const getGroupByMember = (tcdsNumber: string): CrossRefGroup | null => {
  const groups = listGroups();
  return groups.find(g => g.members.includes(tcdsNumber.trim().toUpperCase())) || null;
};

export const createGroup = (members: string[], method: 'manual' | 'auto' = 'manual', confidence?: number): CrossRefGroup => {
  const groups = listGroups();
  const now = new Date().toISOString();

  const newGroup: CrossRefGroup = {
    group_id: Date.now().toString(36) + Math.random().toString(36).substring(2),
    members: [...new Set(members.map(m => m.trim().toUpperCase()).filter(Boolean))],
    created_at: now,
    updated_at: now,
    method,
    confidence
  };

  groups.push(newGroup);
  localStorage.setItem(CROSS_REF_KEY, JSON.stringify(groups));
  return newGroup;
};

export const addToGroup = (groupId: string, tcdsNumber: string): boolean => {
  const groups = listGroups();
  const index = groups.findIndex(g => g.group_id === groupId);

  if (index === -1) return false;

  const normalized = tcdsNumber.trim().toUpperCase();
  if (!normalized) return false;
  if (!groups[index].members.includes(normalized)) {
    groups[index].members.push(normalized);
    groups[index].updated_at = new Date().toISOString();
    localStorage.setItem(CROSS_REF_KEY, JSON.stringify(groups));
  }

  return true;
};

export const removeFromGroup = (groupId: string, tcdsNumber: string): boolean => {
  const groups = listGroups();
  const index = groups.findIndex(g => g.group_id === groupId);

  if (index === -1) return false;

  const normalized = tcdsNumber.trim().toUpperCase();
  groups[index].members = groups[index].members.filter(m => m !== normalized);
  groups[index].updated_at = new Date().toISOString();

  // Remove group if empty
  if (groups[index].members.length === 0) {
    groups.splice(index, 1);
  }

  localStorage.setItem(CROSS_REF_KEY, JSON.stringify(groups));
  return true;
};

export const deleteGroup = (groupId: string): boolean => {
  const groups = listGroups();
  const filtered = groups.filter(g => g.group_id !== groupId);

  if (filtered.length === groups.length) return false;

  localStorage.setItem(CROSS_REF_KEY, JSON.stringify(filtered));
  return true;
};
