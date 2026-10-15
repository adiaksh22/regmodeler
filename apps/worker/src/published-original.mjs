import {ImportError} from './drs.mjs';
// Exact final-publication links only. No FAA credentials are sent to GovInfo.
export function validatePublishedOriginal(record,url) {
 const target=new URL(url);
 const date=record['drs:adfrawdCitationPublishDate'];
 const identity=new URL(record.documentURL).pathname.split('/').at(-1);
 const document=/^FR-ADFRAWD-(\d{4}-\d+)-0+\.0001$/.exec(identity)?.[1];
 if(!document||!/^\d{4}-\d{2}-\d{2}$/.test(date??'')||target.href!==`https://www.govinfo.gov/content/pkg/FR-${date}/pdf/${document}.pdf`)throw new ImportError('PUBLICATION_IDENTITY_MISMATCH');
 return target;
}
export function validateLegacyPublishedOriginal(record,url,documentNumber) {
 const target=new URL(url);
 const date=record['drs:adfrawdCitationPublishDate'];
 if(record['drs:documentNumber']!==documentNumber||!/^\d{4}-\d{2}-\d{2}$/.test(date??'')||
   target.origin!=='https://www.govinfo.gov'||target.username||target.password||target.search||target.hash||
   !new RegExp(`^/content/pkg/FR-${date}/pdf/\\d{2}-\\d+\\.pdf$`).test(target.pathname))throw new ImportError('PUBLICATION_IDENTITY_MISMATCH');
 return target;
}
async function readPdf(target,request) {
 let response;try{response=await request(target,{redirect:'error',signal:AbortSignal.timeout(45000)});}catch{throw new ImportError('PUBLICATION_NETWORK_ERROR');}
 if(!response.ok)throw new ImportError('PUBLICATION_UNAVAILABLE');
 const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>25_000_000)throw new ImportError('SOURCE_FILE_TOO_LARGE');chunks.push(chunk);}
 const bytes=Buffer.concat(chunks);if(bytes.subarray(0,5).toString()!=='%PDF-')throw new ImportError('INVALID_PDF');return bytes;
}
export async function publishedOriginal(record,url,{request=fetch}={}) {return readPdf(validatePublishedOriginal(record,url),request);}
export async function legacyPublishedOriginal(record,url,documentNumber,{request=fetch}={}) {return readPdf(validateLegacyPublishedOriginal(record,url,documentNumber),request);}
