import type {EvidenceRelationship} from '../domain/explorer';

export type ExplorerContextData={model:string;certificate:string;revision:string;family:boolean;profileName?:string;source?:EvidenceRelationship;sourceVisible:boolean};
export default function ExplorerContext({context,focus}:{context:ExplorerContextData;focus:string}){
 const {model,certificate,revision,family,profileName,source,sourceVisible}=context;
 return <section aria-label="Exploration context" className="reg-explorer-context">
  <dl>
   <div><dt>Selected aircraft</dt><dd>{model} · TCDS {certificate} · revision {revision}</dd><dd className="reg-context-note">{profileName?`Saved profile: ${profileName}`:'No saved configuration selected'}</dd></div>
   <div><dt>Network scope</dt><dd>{family?'Reviewed family models':'Selected model'}</dd><dd className="reg-context-note">Exploring: {focus}</dd></div>
   <div><dt>Source citation{!sourceVisible?' · details hidden':''}</dt><dd>{source?`${source.source_document_type??'TCDS'} ${source.source_document_number??certificate} · ${source.evidence_revision} · page ${source.evidence_page}`:'No citation selected'}</dd>{source&&<dd className="reg-context-note">Source model: {source.model}{source.model!==model?' · differs from selected aircraft':''}</dd>}</div>
  </dl>
 </section>;
}
