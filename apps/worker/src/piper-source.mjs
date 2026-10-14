import {ImportError,sha256} from './drs.mjs';
async function read(response,limit){
 if(!response.ok)throw new ImportError('PUBLISHER_UNAVAILABLE');
 const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>limit)throw new ImportError('SOURCE_FILE_TOO_LARGE');chunks.push(chunk);}return Buffer.concat(chunks);
}
export async function verifyPiperReference(reference,{request=fetch}={}){
 const c=reference.conditions;const url=c.publisher_url;
 if(!/^\d+$/.test(reference.publisher_id??'')||!/^https:\/\/s3[.]amazonaws[.]com\/pipercrm\/Solution\/\d+\/[A-Za-z0-9_-]+[.]pdf$/.test(url??'')||new URL(url).pathname.split('/')[3]!==reference.publisher_id)throw new ImportError('PUBLISHER_IDENTITY_MISMATCH');
 const options={redirect:'error',signal:AbortSignal.timeout(45000)};
 const response=await request('https://www.piper.com/wp-admin/admin-ajax.php',{...options,method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({action:'piper_get_publications_url',solution_id:reference.publisher_id})});
 let files;try{files=JSON.parse((await read(response,2_000_000)).toString());}catch(e){if(e instanceof ImportError)throw e;throw new ImportError('INVALID_PUBLISHER_METADATA');}
 const [,number,date]=reference.key.split(':');
 if(!Array.isArray(files)||files.length!==1||files[0].file_url!==url||files[0].pub_reference_num!==`SB ${number}`||files[0].pub_release_date!==date)throw new ImportError('PUBLISHER_IDENTITY_MISMATCH');
 const bytes=await read(await request(url,{redirect:'error',signal:AbortSignal.timeout(45000)}),5_000_000);
 if(bytes.subarray(0,5).toString()!=='%PDF-'||sha256(bytes)!==c.publisher_sha256)throw new ImportError('PUBLISHER_CONTENT_CHANGED');
 return {reference:reference.key,sha256:c.publisher_sha256};
}
