import { CrossRefGroup } from '../types/crossReference';
import {readBrowserRecord,writeBrowserRecord,recordObject,stringFields,browserRecordFailures} from '../lib/browserRecords';

export const CROSS_REF_KEY = 'tcds_cross_references';
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

export const normalizeCertificate=(value:string):string|null=>{
 const normalized=value.trim().toUpperCase();
 return normalized.length<=20&&/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalized)&&/\d/.test(normalized)?normalized:null;
};
export const groupsFingerprint=(groups:CrossRefGroup[])=>JSON.stringify(groups);
export function readPersonalGroups(){
 const groups=listGroups();return {groups,readable:!browserRecordFailures().split(',').includes(CROSS_REF_KEY)};
}
export class PersonalLinkError extends Error{}
const identity=(value:string)=>normalizeCertificate(value)??value;
export function connectedPersonalGroups(groups:CrossRefGroup[],members:string[]){
 const linked=new Set(members.map(identity));const included=new Set<string>();
 let changed=true;
 while(changed){changed=false;for(const group of groups)if(!included.has(group.group_id)&&group.members.some(member=>linked.has(identity(member)))){included.add(group.group_id);group.members.forEach(member=>linked.add(identity(member)));changed=true;}}
 return {members:[...linked],groups:groups.filter(group=>included.has(group.group_id))};
}
function checkedGroups(expected:string){
 const current=readPersonalGroups();
 if(!current.readable)throw new PersonalLinkError('Personal links cannot be read. Existing browser records were preserved.');
 if(groupsFingerprint(current.groups)!==expected)throw new PersonalLinkError('Personal links changed in another window. Review the reloaded group and try again.');
 return current.groups;
}
export function linkCertificates(source:string,target:string,expected:string){
 const from=normalizeCertificate(source),to=normalizeCertificate(target);
 if(!from||!to)throw new PersonalLinkError('Use a certificate number such as 2A13 or A16WE, up to 20 letters, numbers and hyphens.');
 if(from===to)throw new PersonalLinkError('Choose a different certificate; a TCDS cannot link to itself.');
 const groups=checkedGroups(expected),connected=connectedPersonalGroups(groups,[from,to]);
 if(connected.groups.length===1&&connected.groups[0].members.some(member=>identity(member)===from)&&connected.groups[0].members.some(member=>identity(member)===to))return false;
 const now=new Date().toISOString();const first=connected.groups[0];
 const group:CrossRefGroup={group_id:first?.group_id??crypto.randomUUID(),members:connected.members,created_at:first?.created_at??now,updated_at:now,method:'manual'};
 saveGroups([...groups.filter(row=>!connected.groups.some(included=>included.group_id===row.group_id)),group]);return true;
}
export type PersonalLinkUndo={before:CrossRefGroup[];after:string};
export function removePersonalMember(source:string,member:string,expected:string):PersonalLinkUndo {
 const groups=checkedGroups(expected);const connected=connectedPersonalGroups(groups,[source]);
 if(!connected.groups.length||!connected.members.includes(identity(member))||identity(source)===identity(member))throw new PersonalLinkError('This linked certificate is no longer in the group.');
 const remaining=connected.members.filter(value=>value!==identity(member));const first=connected.groups[0];
 const next=groups.filter(row=>!connected.groups.some(included=>included.group_id===row.group_id));
 if(remaining.length>1)next.push({...first,members:remaining,updated_at:new Date().toISOString(),method:'manual'});
 saveGroups(next);return {before:groups,after:groupsFingerprint(next)};
}
export function undoPersonalRemoval(undo:PersonalLinkUndo){
 checkedGroups(undo.after);saveGroups(undo.before);
}
