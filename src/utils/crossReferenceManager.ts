import { CrossRefGroup } from '../types/crossReference';
import {readBrowserRecord,writeBrowserRecord,recordObject,stringFields} from '../lib/browserRecords';

const CROSS_REF_KEY = 'tcds_cross_references';
const validGroups=(value:unknown)=>Array.isArray(value)&&value.every(group=>recordObject(group)&&stringFields(group,['group_id','created_at','updated_at'])&&Array.isArray(group.members)&&group.members.every(member=>typeof member==='string')&&['manual','auto'].includes(String(group.method)));
const saveGroups=(groups:CrossRefGroup[])=>writeBrowserRecord(CROSS_REF_KEY,groups,validGroups);

export const listGroups = (): CrossRefGroup[] => {
  return readBrowserRecord<CrossRefGroup[]>(CROSS_REF_KEY,[],validGroups);
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
  saveGroups(groups);
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
    saveGroups(groups);
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

  saveGroups(groups);
  return true;
};

export const deleteGroup = (groupId: string): boolean => {
  const groups = listGroups();
  const filtered = groups.filter(g => g.group_id !== groupId);

  if (filtered.length === groups.length) return false;

  saveGroups(filtered);
  return true;
};
