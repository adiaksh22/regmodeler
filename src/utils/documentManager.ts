import { TCDSDocument } from '../types/tcds';
import { saveRevision } from './revisionManager';
import {readBrowserRecord,writeBrowserRecord,recordObject,stringFields} from '../lib/browserRecords';

const DOCUMENTS_KEY = 'tcds_documents';
const validDocuments=(value:unknown)=>Array.isArray(value)&&value.every(doc=>recordObject(doc)&&stringFields(doc,['tcds_number','revision','revision_date','url','model'])&&['current','historical'].includes(String(doc.status))&&(doc.holder===undefined||typeof doc.holder==='string'));

export const getDocuments = (): TCDSDocument[] => {
  return readBrowserRecord<TCDSDocument[]>(DOCUMENTS_KEY,[],validDocuments);
};

export const getDocumentByNumber = (tcdsNumber: string): TCDSDocument | null => {
  const docs = getDocuments();
  return docs.find(d => d.tcds_number.trim().toUpperCase() === tcdsNumber.trim().toUpperCase()) || null;
};

export const saveDocument = (doc: TCDSDocument): void => {
  saveRevision(doc);

  const docs = getDocuments();
  const normalizedDoc = { ...doc, tcds_number: doc.tcds_number.trim().toUpperCase() };
  const index = docs.findIndex(d => d.tcds_number.trim().toUpperCase() === normalizedDoc.tcds_number);
  if (index !== -1) {
    docs[index] = normalizedDoc;
  } else {
    docs.push(normalizedDoc);
  }
  writeBrowserRecord(DOCUMENTS_KEY,docs,validDocuments);
};
