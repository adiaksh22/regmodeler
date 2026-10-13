import { TCDSRevision } from '../types/revision';

const REVISIONS_KEY = 'tcds_revisions';

export const deduplicateRevisions = (): void => {
  const data = localStorage.getItem(REVISIONS_KEY);
  if (!data) return;

  const map: Record<string, TCDSRevision[]> = JSON.parse(data);
  
  Object.keys(map).forEach(tcdsNumber => {
    const revisions = map[tcdsNumber];
    const seen = new Set<string>();
    const unique: TCDSRevision[] = [];
    
    // Sort by timestamp descending
    revisions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    for (const rev of revisions) {
      const key = `${rev.content_hash}_${rev.content_length}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(rev);
      }
    }
    
    map[tcdsNumber] = unique;
  });
  
  localStorage.setItem(REVISIONS_KEY, JSON.stringify(map));
  console.log('✅ Deduplicated revisions');
};
