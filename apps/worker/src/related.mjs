import { ImportError, sha256 } from './drs.mjs';

export const models = ['PA-28-140','PA-28-181'];
export const scopes = {
  AD: { type: 'ADFRAWD', filters: { 'drs:adfrawdModel': models } },
  STC: { type: 'STC', filters: { 'drs:stcTCNumbers': ['2A13'], 'drs:stcModel': models } },
  CAR: { type: 'CAR', filters: { 'drs:documentNumber': ['CAR 3'] } },
};
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value==='object') return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
  return value;
}
const clean = value => typeof value==='string' ? value.replaceAll('\\n','\n').replaceAll('\\t',' ').trim() : '';
const date = value => typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) ? value : null;
export function matchingModels(type, record) {
  if (type==='AD') return models.filter(m=>record['drs:adfrawdModel']?.includes(m));
  if (type==='CAR') return [];
  // Preserve TC/model tuple association; independently matching two arrays is unsafe.
  const tuples=record['drs:stcTCNumbersMakeModel'];
  if (Array.isArray(tuples)) return models.filter(model=>tuples.some(tuple=>{
    if(typeof tuple!=='string')return false;
    const parts=tuple.split('--').map(x=>x.trim());return parts.length===3 && parts[0]==='2A13' && parts[2]===model;
  }));
  const tc=record['drs:stcTCNumbers'],names=record['drs:stcModel'];
  return Array.isArray(tc)&&Array.isArray(names)&&tc.length===names.length ? models.filter(m=>names.some((name,i)=>name===m&&tc[i]==='2A13')) : [];
}
export async function collectRelated(source,type,since) {
  const scope=scopes[type];if(!scope)throw new ImportError('UNSUPPORTED_DOCUMENT_TYPE');
  const rows=[];const seen=new Set();let total;
  for(let page=0;page<10;page++){
    const offset=page*750;const result=await source.metadata(scope.type,scope.filters,offset,since);
    const s=result.summary;
    if(!s||!Array.isArray(result.documents)||s.count!==result.documents.length||typeof s.hasMoreItems!=='boolean'||!Number.isInteger(s.totalItems)||s.totalItems<0||s.offset!==offset||result.documents.length>750)throw new ImportError('INVALID_PAGE');
    if(total!==undefined&&total!==s.totalItems)throw new ImportError('CATALOG_CHANGED_DURING_PAGING');total=s.totalItems;
    for(const row of result.documents){
      const url=new URL(row.documentURL);
      if(url.origin!=='https://drs.faa.gov'||url.username||url.password||url.search||url.hash||!/^\/browse\/excelExternalWindow\/[A-Za-z0-9._-]+$/.test(url.pathname)||!row.documentGuid||!url.pathname.endsWith(row.documentGuid+'.0001')||!['Current','Historical','Pending'].includes(row['drs:status'])||!clean(row['drs:documentNumber'])||(row.docLastModifiedDate!==null&&!Number.isFinite(Date.parse(row.docLastModifiedDate))))throw new ImportError('INVALID_RELATED_RECORD');
      if(seen.has(row.documentURL))throw new ImportError('DUPLICATE_PAGE_RECORD');
      if(since&&(!Number.isFinite(Date.parse(row.docLastModifiedDate))||Date.parse(row.docLastModifiedDate)<=Date.parse(since)))throw new ImportError('INCREMENTAL_FILTER_MISMATCH');
      seen.add(row.documentURL);rows.push(row);
    }
    if(!s.hasMoreItems){if(rows.length!==total)throw new ImportError('INCOMPLETE_CATALOG');return rows;}
    if(result.documents.length!==750)throw new ImportError('INCOMPLETE_PAGE');
  }throw new ImportError('PAGE_LIMIT_EXCEEDED');
}
export function relatedSnapshot(type,record,retrievedAt) {
  const bytes=Buffer.from(JSON.stringify(canonical(record)));const hash=sha256(bytes);
  const identity=new URL(record.documentURL).pathname.split('/').at(-1);
  const title=clean(record['drs:title']) || clean(record['drs:adfrawdSubject']) || record['drs:documentNumber'];
  const rawStatus=record['drs:status'].toLowerCase();
  return { bytes, row: {
    document_number:record['drs:documentNumber'].trim().toUpperCase(),title,
    source_version_id:identity+'@'+hash,revision_label:type==='CAR'?clean(record['drs:amendRegNo'])||'Historical CAR source':clean(record['drs:stcStatusDate']??record['drs:adfrawdIssueDate'])||'Registry snapshot',
    revision_date:date(record['drs:stcStatusDate']??record['drs:adfrawdIssueDate']??record['drs:effectiveDate']),status:rawStatus,
    source_url:record.documentURL,retrieved_at:retrievedAt,models:matchingModels(type,record),
    metadata:{ title,source_identity:identity,source_guid:record.documentGuid,source_modified_at:record.docLastModifiedDate,
      source_status:rawStatus,missing_modified_date:record.docLastModifiedDate===null,metadata_sha256:hash,metadata_storage_path:`FAA/${type}/PA28/${hash}.json`,
      effective_date:date(record['drs:effectiveDate']),holder:clean(record['drs:stcHolder']),
      summary:clean(record['drs:adfrawdSummary']).slice(0,3000),regulatory_text:clean(record['drs:adfrawdRegulatoryText']),
      superseded_by:record['drs:adfrawdSupersededBy']??[],supersedes:record['drs:adfrawdSupersededAD']??[],
      primary_pdf_pending:true,additional_attachments_pending:record.hasMoreAttachments===true,
      amendment:clean(record['drs:amendRegNo']),candidate_reason:'Exact FAA registry model match; aircraft-specific applicability or installation is not verified.',
    },
  }};
}
export async function importRelated(client,source,type,{verifyOnly=false,now=()=>new Date().toISOString()}={}) {
  let runId;
  try{
    if(!verifyOnly){const run=await client.from('ingestion_runs').insert({source:`FAA:${scopes[type]?.type}:PA28`,status:'running'}).select('id').single();if(run.error)throw new ImportError('RUN_START_FAILED');runId=run.data.id;}
    const records=await collectRelated(source,type);
    if(!records.length)throw new ImportError('EMPTY_RELATED_CATALOG');
    const knownDates=records.map(r=>Date.parse(r.docLastModifiedDate)).filter(Number.isFinite);
    if(!knownDates.length)throw new ImportError('NO_SOURCE_MODIFICATION_DATES');
    const since=new Date(Math.max(...knownDates)-86400000).toISOString();
    const incremental=await collectRelated(source,type,since);
    const hashes=records.filter(r=>Date.parse(r.docLastModifiedDate)>Date.parse(since)).map(r=>sha256(Buffer.from(JSON.stringify(canonical(r))))).sort();
    if(JSON.stringify(hashes)!==JSON.stringify(incremental.map(r=>sha256(Buffer.from(JSON.stringify(canonical(r))))).sort()))throw new ImportError('INCREMENTAL_RECONCILIATION_MISMATCH');
    if(verifyOnly)return {type,records:records.length,undatedRecords:records.length-knownDates.length,positiveIncrementalRecords:incremental.length};
    const retrievedAt=now();const prepared=records.map(record=>relatedSnapshot(type,record,retrievedAt));
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
    const committed=await client.rpc('commit_pa28_related',{p_run_id:runId,p_type:type,p_records:batch});if(committed.error)throw new ImportError('BATCH_COMMIT_FAILED');
    return {type,records:records.length,undatedRecords:records.length-knownDates.length,modelMatches:batch.reduce((n,r)=>n+r.models.length,0),positiveIncrementalRecords:incremental.length};
  }catch(error){
    const code=error instanceof ImportError?error.code:'RELATED_IMPORT_FAILED';
    if(runId)await client.from('ingestion_runs').update({status:'failed',completed_at:now(),error_code:code}).eq('id',runId).eq('status','running');
    throw new ImportError(code);
  }
}
