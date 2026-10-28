// Reviewed aliases only. Preserve unrelated source labels and all MAX distinctions.
const boeingAliases:Record<string,string>={'737-700 Series':'737-700','737-800 Series':'737-800','737-900ER Series':'737-900ER'};
export const aircraftModelIdentity=(certificate:string,model:string)=>certificate.toUpperCase()==='A16WE'?(boeingAliases[model]??model):model;
