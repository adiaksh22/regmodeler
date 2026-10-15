import { ImportError, sha256 } from './drs.mjs';

export const relatedScopes = {
  PA28: {
    certificate: '2A13', archiveSlug: 'PA28', types: ['AD','STC','CAR'],
    recordLimits:{AD:1000,STC:3000,CAR:100},
    models: [
      { canonical: 'PA-28-140', source: 'PA-28-140' },
      { canonical: 'PA-28-181', source: 'PA-28-181' },
    ],
  },
  B737: {
    certificate: 'A16WE', archiveSlug: 'B737', types: ['AD','STC'],
    recordLimits:{AD:1000,STC:4000},
    models: [
      { canonical: '737-700', source: '737-700 Series' },
      { canonical: '737-800', source: '737-800 Series' },
      { canonical: '737-900ER', source: '737-900ER Series' },
      { canonical: '737-7', source: '737-7' },
      { canonical: '737-8', source: '737-8' },
      { canonical: '737-9', source: '737-9' },
    ],
  },
};
export const models = relatedScopes.PA28.models.map(model=>model.canonical);
export const scopes = {
  AD: { type: 'ADFRAWD', filters: { 'drs:adfrawdModel': models } },
  STC: { type: 'STC', filters: { 'drs:stcTCNumbers': ['2A13'], 'drs:stcModel': models } },
  CAR: { type: 'CAR', filters: { 'drs:documentNumber': ['CAR 3'] } },
};
function scopeDefinition(scopeKey) {
  const definition=relatedScopes[scopeKey];
  if(!definition)throw new ImportError('UNSUPPORTED_RELATED_SCOPE');
  return definition;
}
function sourceContract(type,scopeKey) {
  const definition=scopeDefinition(scopeKey);
  if(!definition.types.includes(type))throw new ImportError('UNSUPPORTED_DOCUMENT_TYPE');
  const sourceModels=definition.models.map(model=>model.source);
  if(type==='AD')return { type:'ADFRAWD', filters:{'drs:adfrawdModel':sourceModels} };
  if(type==='STC')return { type:'STC', filters:{'drs:stcTCNumbers':[definition.certificate],'drs:stcModel':sourceModels} };
  return { type:'CAR', filters:{'drs:documentNumber':['CAR 3']} };
}
export function relatedSourceKey(type,scopeKey='PA28') {
  const definition=scopeDefinition(scopeKey);sourceContract(type,scopeKey);
  return `FAA:${type==='AD'?'ADFRAWD':type}:${definition.archiveSlug}`;
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value==='object') return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
  return value;
}
const clean = value => typeof value==='string' ? value.replaceAll('\\n','\n').replaceAll('\\t',' ').trim() : '';
const date = value => typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) ? value : null;
export function matchingModels(type, record, scopeKey='PA28') {
  const definition=scopeDefinition(scopeKey);sourceContract(type,scopeKey);
  if (type==='AD') return definition.models.filter(model=>record['drs:adfrawdModel']?.includes(model.source)).map(model=>model.canonical);
  if (type==='CAR') return [];
  // Preserve TC/model tuple association; independently matching two arrays is unsafe.
  const tuples=record['drs:stcTCNumbersMakeModel'];
  if (Array.isArray(tuples)) return definition.models.filter(model=>tuples.some(tuple=>{
    if(typeof tuple!=='string')return false;
    const parts=tuple.split('--').map(x=>x.trim());return parts.length===3 && parts[0]===definition.certificate && parts[2]===model.source;
  })).map(model=>model.canonical);
  const tc=record['drs:stcTCNumbers'],names=record['drs:stcModel'];
  return Array.isArray(tc)&&Array.isArray(names)&&tc.length===names.length ? definition.models.filter(model=>names.some((name,i)=>name===model.source&&tc[i]===definition.certificate)).map(model=>model.canonical) : [];
}
export async function collectRelated(source,type,since,scopeKey='PA28') {
  const scope=sourceContract(type,scopeKey);
  const rows=[];const seen=new Set();let total;
  for(let page=0;page<10;page++){
    const offset=page*750;const result=await source.metadata(scope.type,scope.filters,offset,since);
    const s=result.summary;
    if(!s||!Array.isArray(result.documents)||s.count!==result.documents.length||typeof s.hasMoreItems!=='boolean'||!Number.isInteger(s.totalItems)||s.totalItems<0||s.offset!==offset||result.documents.length>750)throw new ImportError('INVALID_PAGE');
    if(total!==undefined&&total!==s.totalItems)throw new ImportError('CATALOG_CHANGED_DURING_PAGING');total=s.totalItems;
    if(total>scopeDefinition(scopeKey).recordLimits[type])throw new ImportError('CATALOG_SCOPE_LIMIT_EXCEEDED');
    for(const row of result.documents){
      const url=new URL(row.documentURL);
      if(url.origin!=='https://drs.faa.gov'||url.username||url.password||url.search||url.hash||!/^\/browse\/excelExternalWindow\/[A-Za-z0-9._-]+$/.test(url.pathname)||!row.documentGuid||!url.pathname.endsWith(row.documentGuid+'.0001')||!['Current','Historical','Pending'].includes(row['drs:status'])||!clean(row['drs:documentNumber'])||(row.docLastModifiedDate!==null&&!Number.isFinite(Date.parse(row.docLastModifiedDate))))throw new ImportError('INVALID_RELATED_RECORD');
      if(seen.has(row.documentURL))throw new ImportError('DUPLICATE_PAGE_RECORD');
      if(since&&(!Number.isFinite(Date.parse(row.docLastModifiedDate))||Date.parse(row.docLastModifiedDate)<=Date.parse(since)))throw new ImportError('INCREMENTAL_FILTER_MISMATCH');
      if(type!=='CAR'&&!matchingModels(type,row,scopeKey).length)throw new ImportError('OUT_OF_SCOPE_RELATED_RECORD');
      seen.add(row.documentURL);rows.push(row);
    }
    if(!s.hasMoreItems){if(rows.length!==total)throw new ImportError('INCOMPLETE_CATALOG');return rows;}
    if(result.documents.length!==750)throw new ImportError('INCOMPLETE_PAGE');
  }throw new ImportError('PAGE_LIMIT_EXCEEDED');
}
export function relatedDeltaNeeded(records,observations,type,scopeKey='PA28') {
  const known=new Map(observations.map(row=>[row.identity,row]));
  return records.some(record=>{const snapshot=relatedSnapshot(type,record,'1970-01-01T00:00:00.000Z',scopeKey).row;const old=known.get(snapshot.metadata.source_identity);return !old||!old.active||old.status!==snapshot.status||old.metadata_hash!==snapshot.metadata.metadata_sha256;});
}

async function readObservations(client,source,identities) {
  const rows=[];
  for(let index=0;index<identities.length;index+=100){const result=await client.from('source_observations').select('identity,metadata_hash,status,active').eq('source',source).in('identity',identities.slice(index,index+100));if(result.error)throw new ImportError('CHECKPOINT_READ_FAILED');rows.push(...(result.data??[]));}
  return rows;
}

export async function checkRelated(client,source,type,{now=()=>new Date().toISOString(),scope='PA28'}={}) {
  const sourceKey=relatedSourceKey(type,scope);
  const checkpoint=await client.from('ingestion_checkpoints').select('source_modified_at').eq('source',sourceKey).maybeSingle();
  if(checkpoint.error)throw new ImportError('CHECKPOINT_READ_FAILED');
  if(!checkpoint.data?.source_modified_at)return importRelated(client,source,type,{now,scope});
  const since=new Date(Date.parse(checkpoint.data.source_modified_at)-86400000).toISOString();
  const records=await collectRelated(source,type,since,scope);
  const identities=records.map(record=>new URL(record.documentURL).pathname.split('/').at(-1));
  const observations=await readObservations(client,sourceKey,identities);
  if(relatedDeltaNeeded(records,observations,type,scope))return {...await importRelated(client,source,type,{now,scope}),mode:'reconciled'};
  const heartbeat=await client.rpc('record_source_check',{p_source:sourceKey,p_observed_modified_at:records.reduce((latest,row)=>!latest||Date.parse(row.docLastModifiedDate)>Date.parse(latest)?row.docLastModifiedDate:latest,checkpoint.data.source_modified_at)});
  if(heartbeat.error)throw new ImportError('CHECKPOINT_WRITE_FAILED');
  return {mode:'checked',scope,type,deltaRecords:records.length,reconciled:false};
}
export function relatedSnapshot(type,record,retrievedAt,scopeKey='PA28') {
  const definition=scopeDefinition(scopeKey);sourceContract(type,scopeKey);
  const bytes=Buffer.from(JSON.stringify(canonical(record)));const hash=sha256(bytes);
  const identity=new URL(record.documentURL).pathname.split('/').at(-1);
  const title=clean(record['drs:title']) || clean(record['drs:adfrawdSubject']) || record['drs:documentNumber'];
  const rawStatus=record['drs:status'].toLowerCase();
  return { bytes, row: {
    document_number:record['drs:documentNumber'].trim().toUpperCase(),title,
    source_version_id:identity+'@'+hash,revision_label:type==='CAR'?clean(record['drs:amendRegNo'])||'Historical CAR source':clean(record['drs:stcStatusDate']??record['drs:adfrawdIssueDate'])||'Registry snapshot',
    revision_date:date(record['drs:stcStatusDate']??record['drs:adfrawdIssueDate']??record['drs:effectiveDate']),status:rawStatus,
    source_url:record.documentURL,retrieved_at:retrievedAt,models:matchingModels(type,record,scopeKey),
    metadata:{ title,source_identity:identity,source_guid:record.documentGuid,source_modified_at:record.docLastModifiedDate,
      source_status:rawStatus,missing_modified_date:record.docLastModifiedDate===null,metadata_sha256:hash,metadata_storage_path:`FAA/${type}/${definition.archiveSlug}/${hash}.json`,
      effective_date:date(record['drs:effectiveDate']),holder:clean(record['drs:stcHolder']),
      summary:clean(record['drs:adfrawdSummary']).slice(0,3000),regulatory_text:clean(record['drs:adfrawdRegulatoryText']),
      superseded_by:record['drs:adfrawdSupersededBy']??[],supersedes:record['drs:adfrawdSupersededAD']??[],
      primary_pdf_pending:true,additional_attachments_pending:record.hasMoreAttachments===true,
      amendment:clean(record['drs:amendRegNo']),candidate_reason:'Exact FAA registry model match; aircraft-specific applicability or installation is not verified.',
    },
  }};
}
export async function importRelated(client,source,type,{verifyOnly=false,now=()=>new Date().toISOString(),scope='PA28'}={}) {
  const definition=scopeDefinition(scope);sourceContract(type,scope);
  let runId;
  try{
    if(!verifyOnly){const run=await client.from('ingestion_runs').insert({source:relatedSourceKey(type,scope),status:'running'}).select('id').single();if(run.error)throw new ImportError('RUN_START_FAILED');runId=run.data.id;}
    const records=await collectRelated(source,type,undefined,scope);
    if(!records.length)throw new ImportError('EMPTY_RELATED_CATALOG');
    const knownDates=records.map(r=>Date.parse(r.docLastModifiedDate)).filter(Number.isFinite);
    if(!knownDates.length)throw new ImportError('NO_SOURCE_MODIFICATION_DATES');
    const since=new Date(Math.max(...knownDates)-86400000).toISOString();
    const incremental=await collectRelated(source,type,since,scope);
    const hashes=records.filter(r=>Date.parse(r.docLastModifiedDate)>Date.parse(since)).map(r=>sha256(Buffer.from(JSON.stringify(canonical(r))))).sort();
    if(JSON.stringify(hashes)!==JSON.stringify(incremental.map(r=>sha256(Buffer.from(JSON.stringify(canonical(r))))).sort()))throw new ImportError('INCREMENTAL_RECONCILIATION_MISMATCH');
    if(verifyOnly)return {scope,type,records:records.length,undatedRecords:records.length-knownDates.length,positiveIncrementalRecords:incremental.length};
    const retrievedAt=now();const prepared=records.map(record=>relatedSnapshot(type,record,retrievedAt,scope));
    let next=0;
    const results=await Promise.allSettled(Array.from({length:4},async()=>{while(next<prepared.length){
      const {bytes,row}=prepared[next++];
      const stored=await client.storage.from('regulatory-sources').upload(row.metadata.metadata_storage_path,bytes,{contentType:'application/json',upsert:false});
      if(stored.error){
        if(String(stored.error.statusCode)!=='409'&&stored.error.error!=='Duplicate')throw new ImportError('SOURCE_ARCHIVE_FAILED');
        const saved=await client.storage.from('regulatory-sources').download(row.metadata.metadata_storage_path);
        if(saved.error||!Buffer.from(await saved.data.arrayBuffer()).equals(bytes))throw new ImportError('SOURCE_ARCHIVE_MISMATCH');
      }
    }}));
    const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;
    const batch=prepared.map(p=>p.row);
    const committed=await client.rpc('commit_related_catalog',{p_run_id:runId,p_scope:scope,p_type:type,p_records:batch});if(committed.error)throw new ImportError('BATCH_COMMIT_FAILED');
    return {scope,type,records:records.length,undatedRecords:records.length-knownDates.length,modelMatches:batch.reduce((n,r)=>n+r.models.length,0),positiveIncrementalRecords:incremental.length};
  }catch(error){
    const code=error instanceof ImportError?error.code:'RELATED_IMPORT_FAILED';
    if(runId)await client.from('ingestion_runs').update({status:'failed',completed_at:now(),error_code:code}).eq('id',runId).eq('status','running');
    throw new ImportError(code);
  }
}
