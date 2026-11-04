// Reviewed aliases only. Preserve unrelated source labels and all MAX distinctions.
const boeingAliases:Record<string,string>={'737-700 Series':'737-700','737-800 Series':'737-800','737-900ER Series':'737-900ER'};
export const aircraftModelIdentity=(certificate:string,model:string)=>certificate.toUpperCase()==='A16WE'?(boeingAliases[model]??model):model;

// Compare case-insensitively, but return the catalog's canonical spelling.
export function matchedAircraftModel(certificate:string,models:string[],query:string):string|null {
 const normalize=(model:string)=>{
  const trimmed=model.trim();
  const alias=Object.keys(boeingAliases).find(key=>key.toUpperCase()===trimmed.toUpperCase());
  return aircraftModelIdentity(certificate,alias??trimmed).toUpperCase();
 };
 const match=models.find(model=>normalize(model)===normalize(query));
 return match?aircraftModelIdentity(certificate,match.trim()):null;
}
