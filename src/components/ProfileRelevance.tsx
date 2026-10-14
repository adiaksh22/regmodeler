import type {ProfileRelevance as Relevance} from '../domain/aircraftProfile';
export default function ProfileRelevance({result}:{result:Relevance|null}) {
  return result&&<div className="rounded border border-slate-300 bg-white p-3 mt-3 text-sm" aria-label="Aircraft profile relevance"><strong>{result.label}</strong><p className="mt-1 text-slate-600">{result.explanation}</p></div>;
}
