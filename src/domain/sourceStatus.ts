export const reviewStates:Record<string,{label:string;explanation:string;attention?:boolean}>={
  pending:{label:'Metadata candidate',explanation:'The FAA index matches this model. Document conditions have not been reviewed for a graph connection.'},
  reviewed:{label:'Reviewed connection',explanation:'The cited evidence supports a connection for this model. Review covers the cited evidence and stated limits; it does not establish individual-aircraft applicability or compliance.'},
  deferred:{label:'Review deferred',explanation:'Review is paused until a source question or missing evidence is resolved. This record is not an approved graph connection.',attention:true},
  rejected:{label:'Excluded from reviewed graph',explanation:'This source observation was excluded during review. This does not establish that it is inapplicable to an individual aircraft.',attention:true},
  historical:{label:'Historical observation',explanation:'This is an older source observation. A current reviewed connection is not asserted for this observation.'},
  unknown:{label:'Review status unavailable',explanation:'The review status could not be established. Use the original source and review coverage before relying on a connection.'},
};
export const qualityStates:Record<string,{label:string;explanation:string}>={
  incomplete_original:{label:'Incomplete original',explanation:'The retrieved original is missing material. Any reviewed connection is limited to the available cited pages.'},
  identity_mismatch:{label:'Record identity mismatch',explanation:'The FAA record identity and the retrieved document differ. They have not been treated as equivalent.'},
};
export function reviewState(status?:string){return reviewStates[status??'unknown']??reviewStates.unknown;}
