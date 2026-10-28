import {useEffect,useState} from 'react';
import {loadSourceQuality,officialReviewedRecord,type SourceQualityFinding} from '../lib/sourceQuality';
import {qualityStates} from '../domain/sourceStatus';
export default function SourceQualityPanel({versionId,model}:{versionId:string;model:string}){
 const [findings,setFindings]=useState<SourceQualityFinding[]>([]);const [notice,setNotice]=useState('');
 useEffect(()=>{let active=true;setFindings([]);setNotice('');void loadSourceQuality(versionId,model).then(result=>{if(active){setFindings(result.findings);setNotice(result.notice??'');}});return()=>{active=false;};},[versionId,model]);
 if(notice)return <p className="text-xs text-amber-900 mt-3" role="status">{notice}</p>;
 if(!findings.length)return null;
 return <section aria-label="Source-quality findings" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3"><h4 className="font-semibold text-sm text-amber-950">Source review notes</h4>{findings.map(finding=><div key={finding.kind} className="mt-2 text-sm text-amber-950"><p className="font-semibold">{qualityStates[finding.kind]?.label??'Source limitation'}</p><p>{finding.summary}</p>{officialReviewedRecord(finding.reviewed_record_url)&&<a className="block mt-2 text-blue-800 underline" href={officialReviewedRecord(finding.reviewed_record_url)!} target="_blank" rel="noopener noreferrer">Open separate reviewed FAA record: {finding.reviewed_record_number}</a>}</div>)}</section>;
}
