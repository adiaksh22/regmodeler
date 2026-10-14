export const cors = { 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'apikey,authorization,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store' };
const reply=(status,error)=>Response.json({error},{status,headers:cors});
export async function handleSourceRequest(request,client,allowedOrigin) {
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(request.method!=='POST')return reply(405,'METHOD_NOT_ALLOWED');
  try {
    if(!request.headers.get('content-type')?.includes('application/json'))return reply(415,'JSON_REQUIRED');
    const chunks=[];let size=0;
    for await(const chunk of request.body??[]){size+=chunk.length;if(size>4096)return reply(413,'REQUEST_TOO_LARGE');chunks.push(chunk);}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    let payload;try{payload=JSON.parse(new TextDecoder().decode(bytes));}catch{return reply(400,'INVALID_VERSION');}
    const versionId=payload?.versionId;
    const attachmentId=payload?.attachmentId;
    if(attachmentId!==undefined&&(typeof attachmentId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(attachmentId)))return reply(400,'INVALID_ATTACHMENT');
    if(typeof versionId!=='string'||! /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(versionId))return reply(400,'INVALID_VERSION');
    const record=await client.from('document_versions').select('id,is_published,storage_path,content_sha256,document:documents!document_versions_document_id_fkey(is_published,authority,document_type)').eq('id',versionId).maybeSingle();
    const v=record.data;const d=v?.document;
    if(record.error||!v?.is_published||!d?.is_published||d.authority!=='FAA'||!['TCDS','AD','STC','CAR'].includes(d.document_type)||
      !/^[a-f0-9]{64}$/.test(v.content_sha256??'')||!new RegExp(`^FAA/${d.document_type}/(?:[A-Z0-9]+|reviewed)/${v.content_sha256}\\.pdf$`).test(v.storage_path??''))return reply(404,'SOURCE_UNAVAILABLE');
    let path=v.storage_path;
    if(attachmentId){
      const result=await client.from('source_attachments').select('version_id,storage_path,content_sha256,mime_type').eq('id',attachmentId).eq('version_id',versionId).maybeSingle();
      const a=result.data;
      if(result.error||!a||a.version_id!==versionId||a.mime_type!=='application/pdf'||!/^[a-f0-9]{64}$/.test(a.content_sha256??'')||a.storage_path!==`FAA/ATTACHMENT/reviewed/${a.content_sha256}.pdf`)return reply(404,'SOURCE_UNAVAILABLE');
      path=a.storage_path;
    }
    const signed=await client.storage.from('regulatory-sources').createSignedUrl(path,300);
    if(signed.error||!signed.data?.signedUrl||new URL(signed.data.signedUrl).origin!==allowedOrigin)return reply(404,'SOURCE_UNAVAILABLE');
    return Response.json({url:signed.data.signedUrl,expiresIn:300},{headers:cors});
  } catch {return reply(503,'SOURCE_UNAVAILABLE');}
}
