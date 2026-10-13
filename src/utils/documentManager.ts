import { TCDSDocument } from '../types/tcds';
import { saveRevision } from './revisionManager';

const DOCUMENTS_KEY = 'tcds_documents';

export const getDocuments = (): TCDSDocument[] => {
  const data = localStorage.getItem(DOCUMENTS_KEY);
  return data ? JSON.parse(data) : [];
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
  localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(docs));
};
