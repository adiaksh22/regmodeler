import { TCDSExtractedData, ChangeType, TCDSChangeLogEntry } from '../types/tcds';
import { getChangeLogs, addChangeLog, generateContentHash } from './changeLogManager';
import { addChangeLogEntry, addIssue } from './storageManager';
import { parseTCDSEntities, saveEntities } from './tcdsParser';

const normalizeText = (text: string): string => {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^\s+|\s+$/g, '')
    .toLowerCase();
};

const extractTCDSFields = (html: string): TCDSExtractedData => {
  const revisionMatch = html.match(/revision[:\s]+(\d+)/i);
  const dateMatch = html.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/);
  const holderMatch = html.match(/holder[:\s]+([^<\n]+)/i);
  const statusMatch = html.match(/status[:\s]+([^<\n]+)/i);

  return {
    revision_number: revisionMatch?.[1] || '',
    revision_date: dateMatch?.[1] || '',
    holder: holderMatch?.[1]?.trim() || '',
    status: statusMatch?.[1]?.trim() || ''
  };
};

const determineChangeType = (oldRev: string, newRev: string, oldHash: string, newHash: string): ChangeType => {
  if (oldRev !== newRev) return 'revision_updated';
  if (oldHash !== newHash) return 'content_changed_same_revision';
  return 'metadata_mismatch';
};

export const checkTCDSForChanges = async (tcdsId: string, sourceUrl: string): Promise<void> => {
  const response = await fetch(sourceUrl);
  const html = await response.text();
  
  const extracted = extractTCDSFields(html);
  const normalized = normalizeText(html);
  const hash = await generateContentHash(normalized);
  
  const logs = getChangeLogs();
  const previous = logs.find(log => log.tcds_id === tcdsId);
  
  if (!previous || previous.content_hash !== hash) {
    const changeType = previous 
      ? determineChangeType(previous.last_revision_seen, extracted.revision_number, previous.content_hash, hash)
      : 'revision_updated';
    
    addChangeLog({
      id: crypto.randomUUID(),
      tcds_id: tcdsId,
      source_url: sourceUrl,
      last_checked_at: new Date().toISOString(),
      content_hash: hash,
      last_revision_seen: extracted.revision_number,
      last_revision_seen_date: extracted.revision_date,
      changes: previous ? ['Content changed'] : ['Initial']
    });
    
    addChangeLogEntry({
      id: crypto.randomUUID(),
      tcds_number: tcdsId,
      detected_at: new Date().toISOString(),
      change_type: changeType,
      summary: `${changeType.replace(/_/g, ' ')} detected`,
      old_hash: previous?.content_hash || '',
      new_hash: hash
    });
    
    const entities = parseTCDSEntities(tcdsId, html, extracted.revision_number, extracted.revision_date);
    saveEntities(entities);
    
    if (previous && extracted.holder !== previous.last_revision_seen) {
      addIssue({
        id: crypto.randomUUID(),
        tcds_number: tcdsId,
        issue_type: 'field_mismatch',
        field_name: 'holder',
        table_value: previous.last_revision_seen,
        source_value: extracted.holder,
        status: 'open'
      });
    }
  }
};

export const startBackgroundJob = (tcdsUrls: Array<{ id: string; url: string }>, intervalMs = 3600000): NodeJS.Timeout => {
  const job = async () => {
    for (const { id, url } of tcdsUrls) {
      try {
        await checkTCDSForChanges(id, url);
      } catch (error) {
        console.error(`Error checking TCDS ${id}:`, error);
      }
    }
  };
  
  job();
  return setInterval(job, intervalMs);
};
