import { ImportError,sha256 } from './drs.mjs';
import { relatedSnapshot } from './related.mjs';
export async function archiveReviewedSource(client,type,record,bytes,expectedHash,material={},scope='PA28') {
  if(sha256(bytes)!==expectedHash||bytes.subarray(0,5).toString()!=='%PDF-')throw new ImportError('REVIEWED_SOURCE_MISMATCH');
  const row=relatedSnapshot(type,record,new Date().toISOString(),scope).row;
  const version=await client.from('document_versions').select('id').eq('source_version_id',row.source_version_id).maybeSingle();
  if(version.error||!version.data)throw new ImportError('REVIEWED_METADATA_MISMATCH');
  const path=`FAA/${type}/reviewed/${expectedHash}.pdf`;
  const saved=await client.storage.from('regulatory-sources').upload(path,bytes,{contentType:'application/pdf',upsert:false});
  if(saved.error){
    if(String(saved.error.statusCode)!=='409'&&saved.error.error!=='Duplicate')throw new ImportError('SOURCE_ARCHIVE_FAILED');
    const existing=await client.storage.from('regulatory-sources').download(path);
    if(existing.error||!Buffer.from(await existing.data.arrayBuffer()).equals(bytes))throw new ImportError('SOURCE_ARCHIVE_MISMATCH');
  }
  const attached=await client.rpc('attach_source_original',{p_version_id:version.data.id,p_hash:expectedHash,p_path:path,p_material:material});
  if(attached.error)throw new ImportError('ORIGINAL_ATTACH_FAILED');
  return version.data.id;
}
