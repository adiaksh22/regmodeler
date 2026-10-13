import { XMLParser } from 'fast-xml-parser';
import { ImportError, sha256 } from './drs.mjs';
export const referenceUrl='https://www.govinfo.gov/content/pkg/CFR-2016-title14-vol1/xml/CFR-2016-title14-vol1-part23.xml';
const sections=['23.207','23.221','23.955','23.959','23.1327','23.1547','23.1557'];
function text(items){return (items??[]).map(node=>Object.entries(node).filter(([key])=>key!==':@').map(([key,value])=>key==='#text'?value:Array.isArray(value)?text(value):'').join('')).join('');}
function tag(items,name){return items.find(node=>node[name])?.[name];}
function findSections(items,result=[]){for(const node of items){for(const [key,value] of Object.entries(node)){if(key==='SECTION')result.push(value);else if(Array.isArray(value))findSections(value,result);}}return result;}
export function extractReference(xml,retrievedAt) {
  if(xml.length>5_000_000||/<!DOCTYPE|<!ENTITY/i.test(xml))throw new ImportError('UNSAFE_REFERENCE_XML');
  const parsed=new XMLParser({preserveOrder:true,ignoreAttributes:false,parseTagValue:false,trimValues:false}).parse(xml);
  const granule=tag(parsed,'CFRGRANULE');const info=tag(granule??[],'FDSYS');
  if(!info||text(tag(info,'CFRTITLE'))!=='14'||text(tag(info,'DATE'))!=='2016-01-01'||text(tag(info,'GRANULENUM'))!=='23')throw new ImportError('REFERENCE_EDITION_MISMATCH');
  const hash=sha256(Buffer.from(xml));const rows=[];
  for(const node of findSections(parsed)){
    const section=text(tag(node,'SECTNO')).replace(/[§\s]/g,'');if(!sections.includes(section))continue;
    const heading=text(tag(node,'SUBJECT')).replace(/\s+/g,' ').trim();
    const body=node.map(child=>Object.entries(child).filter(([key])=>key!==':@').map(([,value])=>Array.isArray(value)?text(value).replace(/\s+/g,' ').trim():'').join('')).filter(Boolean).join('\n\n');
    if(!heading||!body)throw new ImportError('REFERENCE_SECTION_EMPTY');
    rows.push({section,title:heading,body_text:body,source_kind:'later_reference',edition_date:'2016-01-01',
      basis_key:`FAR:${section==='23.1557'?'23.1557(c)(1)':section}:amendment:${['23.1327','23.1547'].includes(section)?'23-20':section==='23.1557'?'23-18':'23-7'}`,
      source_url:referenceUrl,content_sha256:hash,storage_path:`US/CFR/2016/${hash}.xml`,retrieved_at:retrievedAt,
      text_quality:'publisher_xml',contains_graphics:JSON.stringify(node).includes('GPH')||JSON.stringify(node).includes('GRAPHIC'),
    });
  }
  if(rows.length!==sections.length||new Set(rows.map(r=>r.section)).size!==sections.length)throw new ImportError('REFERENCE_COVERAGE_INCOMPLETE');
  return rows;
}
export async function importReference(client,{request=fetch,now=()=>new Date().toISOString()}={}) {
  const r=await request(referenceUrl,{redirect:'error',signal:AbortSignal.timeout(45000)});if(!r.ok)throw new ImportError('REFERENCE_FETCH_FAILED');
  const chunks=[];let size=0;
  for await(const chunk of r.body){size+=chunk.length;if(size>5_000_000)throw new ImportError('SOURCE_FILE_TOO_LARGE');chunks.push(chunk);}
  const bytes=Buffer.concat(chunks);const xml=bytes.toString('utf8');const rows=extractReference(xml,now());
  const saved=await client.storage.from('regulatory-sources').upload(rows[0].storage_path,bytes,{contentType:'application/xml',upsert:false});
  if(saved.error){
    if(String(saved.error.statusCode)!=='409'&&saved.error.error!=='Duplicate')throw new ImportError('SOURCE_ARCHIVE_FAILED');
    const existing=await client.storage.from('regulatory-sources').download(rows[0].storage_path);
    if(existing.error||!Buffer.from(await existing.data.arrayBuffer()).equals(bytes))throw new ImportError('SOURCE_ARCHIVE_MISMATCH');
  }
  const result=await client.rpc('commit_reference_texts',{p_rows:rows});if(result.error)throw new ImportError('REFERENCE_COMMIT_FAILED');
  return {sections:result.data,edition:'2016-01-01',sourceKind:'later_reference'};
}
