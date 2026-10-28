import type {ApplicabilityRule} from '../domain/explorer';

const operator=(value:string)=>({present:'is present',absent:'is absent',equals:'equals',one_of:'is one of',inclusive_range:'is in range',at_or_before:'at or before',later_than:'later than'}[value]??value.replaceAll('_',' '));
const expected=(value:unknown):string=>{
 if(value&&typeof value==='object'&&'minimum' in value&&'maximum' in value)return `${value.minimum} through ${value.maximum} inclusive`;
 return value===true?'required':Array.isArray(value)?value.join(', '):typeof value==='object'?JSON.stringify(value):String(value);
};

export default function ApplicabilityLogic({rules}:{rules:ApplicabilityRule[]}){
 if(!rules.length)return null;
 const groups=[...new Map(rules.map(rule=>[rule.group_id,{label:rule.group_label,operator:rule.match_operator,rules:rules.filter(item=>item.group_id===rule.group_id)}])).values()];
 return <section className="mt-4 border-t border-blue-200 pt-3" aria-label="Structured applicability logic"><p className="text-xs font-bold uppercase tracking-wide text-blue-900">{groups.length>1?'Alternative configuration paths':'Reviewed applicability conditions'}</p><p className="mt-1 text-xs text-slate-600">{groups.length>1?'Match the conditions in at least one group.':'Match the conditions in this group.'} ALL requires every condition; ANY requires at least one. Profile data does not yet prove these details.</p><div className="mt-2 space-y-2">{groups.map((group,index)=><div key={group.label} className="rounded border border-blue-200 bg-white p-2">{index>0&&<span className="-mt-5 mb-2 block w-fit rounded-full bg-blue-100 px-2 text-[10px] font-bold text-blue-900">OR</span>}<p className="text-xs font-semibold">{group.label} · {group.operator.toUpperCase()}</p><ul className="mt-1 space-y-1">{group.rules.map(rule=><li key={rule.predicate_id} className="text-xs text-slate-700"><span className="font-medium">{rule.subject_key}</span> {operator(rule.comparison)} {expected(rule.expected)}</li>)}</ul></div>)}</div></section>;
}
