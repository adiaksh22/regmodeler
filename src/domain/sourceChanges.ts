export type SourceChange = {
  id:string;detected_at:string;kind:string;models:string[];changed_fields:string[];document_type:string;document_number:string;
  old_version_id:string|null;new_version_id:string|null;old_source_url:string|null;new_source_url:string|null;old_revision:string|null;new_revision:string|null;
  old_source_status:string|null;new_source_status:string|null;
  old_metadata:Record<string,string|null>|null;new_metadata:Record<string,string|null>|null;
};
export type SourceMonitoring={source:string;last_success:string|null;last_attempt:string|null;status:string|null;baseline_ready:boolean};
export function changeLabel(kind:string){return {discovered:'First observed after baseline',changed:'Source observation changed',missing_from_index:'No longer returned by scoped index',returned_to_index:'Returned to scoped index'}[kind]??'Source observation';}
