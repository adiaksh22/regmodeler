// Curated, visually inspected originals. A different PDF must receive a new review.
import {createClient} from '@supabase/supabase-js';
import {readWorkerConfig} from './check.mjs';
import {drsClient,ImportError} from './drs.mjs';
import {collectRelated} from './related.mjs';
import {archiveReviewedSource} from './reviewed-sources.mjs';
const reviewed=[
  {type:'AD',identity:'1435453A14D21FB6862586290049FC9F.0001',hash:'56bcc802e7a5a992be7a62c9fa84c9c31cf6cbeccbf0ef93584a73ab9c64652d'},
  {type:'STC',identity:'DRSDOCID107181097320231011141916.0001',hash:'42968de3068a3da4cf72896c64d1ae06db594feb7889855d4c43d9fe71371463'},
  {type:'CAR',identity:'FAA00000000000000000CAR003007PDF.0001',hash:'37dcede85853240718170ed439e9208748ccde1a160513c0f04b1344300da330',material:{basis_key:'CAR3:1956-05-15',source_kind:'exact_historical',edition_date:'1956-05-15',source_title:'CAR 3 as amended May 15, 1956',text_quality:'original_scan',body_text:null,section:null}},
  {type:'CAR',identity:'FAA00000000000000000CAR003020PDF.0001',hash:'5f448d5b2b6b3d97fe3059203df152dc81c5176330ea0827c2a305855c9d0164',material:{basis_key:'CAR3:1956-05-15',source_kind:'exact_historical',edition_date:'1962-05-03',source_title:'CAR 3 amendment 3-7',text_quality:'original_scan',body_text:null,section:null}},
];
try {
  const config=readWorkerConfig(process.env);const client=createClient(config.url,config.secret,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(i,n)=>fetch(i,{...n,signal:AbortSignal.timeout(45000)})}});
  const source=drsClient(process.env.FAA_DRS_API_KEY);
  for(const type of ['AD','STC','CAR']){
    const records=await collectRelated(source,type);
    for(const entry of reviewed.filter(r=>r.type===type)){
      const record=records.find(r=>r.documentURL.endsWith('/'+entry.identity));if(!record)throw new ImportError('REVIEWED_RECORD_UNAVAILABLE');
      const bytes=await source.pdf(record.mainDocumentDownloadURL);
      await archiveReviewedSource(client,type,record,bytes,entry.hash,entry.material);
    }
  }
  const r=await client.rpc('review_pa28_related_graph');if(r.error)throw new ImportError('GRAPH_REVIEW_FAILED');
  console.log(JSON.stringify({reviewedOriginals:reviewed.length,connections:r.data}));
}catch(e){console.error(JSON.stringify({status:'failed',code:e instanceof ImportError?e.code:'SOURCE_REVIEW_FAILED'}));process.exitCode=1;}
