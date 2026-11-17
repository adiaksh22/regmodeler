import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {CROSS_REF_KEY,createGroup,listGroups,normalizeCertificate,readPersonalGroups,groupsFingerprint,connectedPersonalGroups,linkCertificates,removePersonalMember,undoPersonalRemoval} from './crossReferenceManager';
const fingerprint=()=>groupsFingerprint(listGroups());
beforeEach(()=>{localStorage.clear();});afterEach(()=>vi.restoreAllMocks());
describe('personal certificate group workflows',()=>{
 it('normalizes certificate syntax without claiming that a certificate exists',()=>{
  expect(normalizeCertificate(' a16we ')).toBe('A16WE');expect(normalizeCertificate('4-392')).toBe('4-392');
  for(const value of ['','hello','2A13<script>','2 A13','--123','A'.repeat(21)])expect(normalizeCertificate(value)).toBeNull();
 });
 it('rejects self-links and duplicates without changing saved records',()=>{
  expect(()=>linkCertificates('2A13',' 2a13 ',fingerprint())).toThrow('itself');
  linkCertificates('2A13',' a16we ',fingerprint());const before=localStorage.getItem(CROSS_REF_KEY);
  expect(linkCertificates('A16WE','2A13',fingerprint())).toBe(false);expect(localStorage.getItem(CROSS_REF_KEY)).toBe(before);
 });
 it('merges both existing groups without losing their members',()=>{
  createGroup(['2A13','A16WE']);createGroup(['3A12','E00088EN']);
  linkCertificates('2A13','3A12',fingerprint());expect(listGroups()).toHaveLength(1);
  expect(new Set(listGroups()[0].members)).toEqual(new Set(['2A13','A16WE','3A12','E00088EN']));
 });
 it('joins an existing target group and repairs overlapping legacy groups as one group',()=>{
  createGroup(['A16WE','3A12']);createGroup(['3A12','E00088EN']);
  expect(connectedPersonalGroups(listGroups(),['A16WE']).members).toHaveLength(3);
  linkCertificates('2A13','A16WE',fingerprint());expect(listGroups()).toHaveLength(1);expect(listGroups()[0].members).toHaveLength(4);
 });
 it('removes only a group member and allows Undo without duplicating links',()=>{
  createGroup(['2A13','A16WE','3A12']);const before=localStorage.getItem(CROSS_REF_KEY);
  const undo=removePersonalMember('2A13','A16WE',fingerprint());expect(listGroups()[0].members).toEqual(['2A13','3A12']);
  undoPersonalRemoval(undo);expect(localStorage.getItem(CROSS_REF_KEY)).toBe(before);
  const pair=removePersonalMember('2A13','A16WE',fingerprint());removePersonalMember('2A13','3A12',fingerprint());expect(listGroups()).toEqual([]);
  expect(()=>undoPersonalRemoval(pair)).toThrow('changed');
 });
 it('refuses stale mutations and preserves unreadable and quota-limited data',()=>{
  const stale=fingerprint();createGroup(['2A13','A16WE']);expect(()=>linkCertificates('2A13','3A12',stale)).toThrow('changed');
  const before=localStorage.getItem(CROSS_REF_KEY);vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('quota');});
  expect(()=>removePersonalMember('2A13','A16WE',fingerprint())).toThrow('preserved');expect(localStorage.getItem(CROSS_REF_KEY)).toBe(before);
  vi.restoreAllMocks();localStorage.setItem(CROSS_REF_KEY,'{keep');expect(readPersonalGroups().readable).toBe(false);
  expect(()=>linkCertificates('2A13','3A12',groupsFingerprint([]))).toThrow('preserved');expect(localStorage.getItem(CROSS_REF_KEY)).toBe('{keep');
 });
});
