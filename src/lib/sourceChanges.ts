import {publicCatalogClient as client} from './publicClient';
export async function loadSourceChanges(model:string,type:string,offset=0){
  if(!client)return {events:[],monitoring:[],total:0,notice:'Connect the shared catalog to read source checks and change events.'};
  try{
    let query=client.from('source_change_feed').select('*',{count:'exact'}).order('detected_at',{ascending:false}).order('id').range(offset,offset+19);
    if(model)query=query.contains('models',[model]);if(type)query=query.eq('document_type',type);
    const [events,checks]=await Promise.all([query,client.rpc('source_monitoring_coverage')]);
    if(events.error||checks.error)throw new Error();
    return {events:events.data??[],monitoring:checks.data??[],total:events.count??0,notice:''};
  }catch{return {events:[],monitoring:[],total:0,notice:'Source changes are temporarily unavailable. This does not mean no changes occurred.'};}
}
