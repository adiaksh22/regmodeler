import type {EvidenceRelationship} from './explorer';

export const profileModels = ['PA-28-140', 'PA-28-181'] as const;
export type InstallationStatus = 'installed' | 'not_installed' | 'unknown';
export type EquipmentEntry = {key:string; status:InstallationStatus; note:string};
export type AircraftProfile = {
  id: string; model: string; name: string; serial: string;
  modifications: {number: string; status: InstallationStatus; note: string}[];
  equipment?: EquipmentEntry[];
  updatedAt: string;
};
export type ProfileRelevance = {label: string; explanation: string; category: 'match'|'outside'|'unknown'|'reported';};

export function validateProfile(profile: AircraftProfile): string | null {
  if (!profileModels.includes(profile.model as typeof profileModels[number])) return 'This phase supports PA-28-140 and PA-28-181 profiles.';
  if (!profile.name.trim() || profile.name.length > 80) return 'Enter a profile name of up to 80 characters.';
  if (profile.serial.length > 32 || (profile.serial && !/^[A-Z0-9-]+$/.test(profile.serial))) return 'Use the aircraft serial number, including its prefix and hyphen; leave it blank if unknown.';
  if (profile.modifications.length > 50) return 'A profile can contain up to 50 modification entries.';
  const seen = new Set<string>();
  for (const mod of profile.modifications) {
    if (!/^[A-Z0-9][A-Z0-9 ()/-]{0,59}$/.test(mod.number) || !['installed','not_installed','unknown'].includes(mod.status) || mod.note.length > 300) return 'Check each STC number, installation status and note (up to 300 characters).';
    if (seen.has(mod.number)) return 'Use one installation entry for each STC number.';
    seen.add(mod.number);
  }
  const equipment=profile.equipment??[];
  if(equipment.length>50)return 'A profile can contain up to 50 equipment entries.';
  const equipmentKeys=new Set<string>();
  for(const item of equipment){
    if(!/^[A-Z0-9][A-Z0-9 ._:/()-]{0,119}$/.test(item.key)||!['installed','not_installed','unknown'].includes(item.status)||item.note.length>300)return 'Check each equipment selection, installation status and note (up to 300 characters).';
    if(equipmentKeys.has(item.key))return 'Use one installation entry for each equipment item.';
    equipmentKeys.add(item.key);
  }
  return null;
}

// Evaluate only the reviewed conditions supplied by the current published graph.
// No conditions are extracted from candidate metadata or inferred from missing entries.
export function profileRelevance(profile: AircraftProfile | null, edge: EvidenceRelationship): ProfileRelevance | null {
  if (!profile || profile.model !== edge.model) return null;
  if (edge.relationship_type === 'approved_for' && edge.source_document_type === 'STC') {
    const mod = profile.modifications.find(m => m.number === edge.source_document_number);
    return {category: mod?.status === 'installed' ? 'reported' : 'unknown',
      label: mod?.status === 'installed' ? 'Installed — user reported' : mod?.status === 'not_installed' ? 'Not installed — user reported' : 'Installation unknown',
      explanation: 'The source establishes model approval scope. Profile entries do not verify installation, compatibility, design-data rights or compliance.'};
  }
  if (edge.relationship_type !== 'applies_to' || edge.source_document_type !== 'AD') return null;
  const equipmentKey=edge.applicability_conditions.equipment_key;
  if(equipmentKey){
    const item=(profile.equipment??[]).find(entry=>entry.key===equipmentKey);
    if(item?.status==='not_installed')return {category:'outside',label:'Equipment not installed — user reported',explanation:'This reviewed AD path depends on the identified equipment. The profile entry is user reported and does not clear other ADs or configurations.'};
    if(item?.status==='installed')return {category:'reported',label:'Affected equipment installed — user reported',explanation:'The profile matches the reviewed equipment family. Part number, software, serial, configuration, prior work and compliance conditions still require source and aircraft-record review.'};
    return {category:'unknown',label:'Equipment installation unknown',explanation:'This AD path depends on installed equipment. Select an equipment status from aircraft records; missing information remains unknown.'};
  }
  const raw = edge.applicability_conditions.serial_ranges;
  if (!raw) return {category:'unknown',label:'Configuration needs review',explanation:'No machine-readable reviewed serial scope is available for this connection.'};
  const parse=(value:string)=>{const m=/^(?:(\d+)-)?(\d+)$/.exec(value);return m&&Number.isSafeInteger(Number(m[2]))?{prefix:m[1]??'',digits:m[2],value:Number(m[2])}:null;};
  const ranges=raw.replace(/\.$/,'').split(';').map(part=>{const m=/^\s*(\S+) through (\S+)\s*$/.exec(part);return m?{low:parse(m[1]),high:parse(m[2])}:null;});
  const serial=parse(profile.serial);
  if (!serial || ranges.some(r=>!r?.low||!r.high||r.low.prefix!==r.high.prefix||r.low.digits.length!==r.high.digits.length||r.low.value>r.high.value)) return {category:'unknown',label:'Serial number needs review',explanation:'Enter the complete serial number in the reviewed source format. Unsupported formats remain unknown.'};
  const sameFormat = ranges.some(r => r?.low?.prefix===serial.prefix&&r.low.digits.length===serial.digits.length);
  if (!sameFormat) return {category:'unknown',label:'Serial format needs review',explanation:'This serial format does not match the reviewed ranges. Verify the data plate and original source.'};
  const match = ranges.some(r => r?.low&&r.high&&r.low.prefix===serial.prefix&&r.low.digits.length===serial.digits.length&&serial.value>=r.low.value&&serial.value<=r.high.value);
  return {category:match?'match':'outside',label:match?'Within reviewed serial range':'Outside reviewed serial ranges',
    explanation:match?'The entered model and serial match this source scope. Required actions, previous work and compliance still need review.':'The entered serial is outside this connection’s reviewed ranges. This does not clear other ADs or establish aircraft compliance.'};
}
