import {ImportError} from './drs.mjs';
// Delta reads can fail before a full importer creates its own run. Persist that
// failure without advancing the last successful checkpoint or exposing messages.
export async function metadataCheck(client,source,operation,{now=()=>new Date().toISOString()}={}){
 const started=now();
 try{return await operation();}
 catch(error){
  const code=error instanceof ImportError&&/^[A-Z][A-Z0-9_]{0,79}$/.test(error.code)?error.code:'SOURCE_CHECK_FAILED';
  const recorded=await client.from('ingestion_runs').insert({source,status:'failed',started_at:started,completed_at:now(),error_code:code});
  if(recorded.error)throw new ImportError('CHECK_FAILURE_RECORD_FAILED');
  throw new ImportError(code);
 }
}
