import { TCDSEntity } from '../types/tcds';

const ENTITY_KEY = 'tcds_entities';

export const parseTCDSEntities = (tcdsNumber: string, html: string, version: string, date: string): TCDSEntity[] => {
  const entities: TCDSEntity[] = [];
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  
  const requirementPatterns = [/shall\s+([^.]{10,100})/gi, /must\s+([^.]{10,100})/gi, /required\s+to\s+([^.]{10,100})/gi];
  requirementPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        id: crypto.randomUUID(),
        tcds_number: tcdsNumber,
        entity_type: 'requirement',
        content: match[0].trim(),
        version,
        date
      });
    }
  });
  
  const systemPatterns = [/(fuel|hydraulic|electrical|flight control|landing gear)\s+system/gi];
  systemPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        id: crypto.randomUUID(),
        tcds_number: tcdsNumber,
        entity_type: 'system',
        content: match[0].trim(),
        version,
        date
      });
    }
  });
  
  const hazardPatterns = [/(failure|hazard|risk|unsafe)\s+([^.]{10,80})/gi];
  hazardPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        id: crypto.randomUUID(),
        tcds_number: tcdsNumber,
        entity_type: 'hazard',
        content: match[0].trim(),
        version,
        date
      });
    }
  });
  
  const testPatterns = [/(test|testing|inspection|verification)\s+([^.]{10,80})/gi];
  testPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        id: crypto.randomUUID(),
        tcds_number: tcdsNumber,
        entity_type: 'test_method',
        content: match[0].trim(),
        version,
        date
      });
    }
  });
  
  const compliancePatterns = [/(complies with|compliance|certified|approved)\s+([^.]{10,80})/gi];
  compliancePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        id: crypto.randomUUID(),
        tcds_number: tcdsNumber,
        entity_type: 'compliance_evidence',
        content: match[0].trim(),
        version,
        date
      });
    }
  });
  
  return entities;
};

export const saveEntities = (entities: TCDSEntity[]): void => {
  const existing = getEntities();
  localStorage.setItem(ENTITY_KEY, JSON.stringify([...existing, ...entities]));
};

export const getEntities = (): TCDSEntity[] => {
  const data = localStorage.getItem(ENTITY_KEY);
  return data ? JSON.parse(data) : [];
};

export const getEntitiesByTCDS = (tcdsNumber: string): TCDSEntity[] => {
  return getEntities().filter(e => e.tcds_number === tcdsNumber);
};
