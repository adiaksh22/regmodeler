import {beforeEach,describe,expect,it,vi,afterEach} from 'vitest';
import {listGroups,createGroup} from '../utils/crossReferenceManager';
import {getRevisionsByTCDS,saveRevision} from '../utils/revisionManager';
import {getIssues,getChangeLogEntries,addIssue} from '../utils/storageManager';
import {getDocuments} from '../utils/documentManager';
import {browserRecordFailures} from './browserRecords';
import {tcdsSamples} from '../data/tcdsSamples';
beforeEach(()=>{localStorage.clear();});afterEach(()=>vi.restoreAllMocks());
describe('non-destructive browser-record recovery',()=>{
 for(const [key,read] of [['tcds_cross_references',listGroups],['tcds_revisions',()=>getRevisionsByTCDS('2A13')],['tcds_issues',getIssues],['tcds_change_log_entries',getChangeLogEntries],['tcds_documents',getDocuments]] as const){
  it(`keeps source browsing alive and preserves malformed ${key}`,()=>{
   for(const raw of ['{broken','null','42','[null]','{}']){
    if(key==='tcds_revisions'&&raw==='{}')continue;
    localStorage.setItem(key,raw);expect(read()).toEqual([]);expect(localStorage.getItem(key)).toBe(raw);expect(browserRecordFailures()).toContain(key);
   }
  });
 }
 it('refuses writes over corrupt saved links, histories and issues',()=>{
  localStorage.setItem('tcds_cross_references','{keep');expect(()=>createGroup(['2A13','A16WE'])).toThrow('preserved');expect(localStorage.getItem('tcds_cross_references')).toBe('{keep');
  localStorage.setItem('tcds_revisions','[null]');expect(()=>saveRevision(tcdsSamples[0])).toThrow('preserved');expect(localStorage.getItem('tcds_revisions')).toBe('[null]');
  localStorage.setItem('tcds_issues','null');expect(()=>addIssue({id:'one',tcds_number:'2A13',issue_type:'note',field_name:'holder',table_value:'x',source_value:'y',status:'open'})).toThrow('preserved');expect(localStorage.getItem('tcds_issues')).toBe('null');
 });
 it('does not let a legacy certificate key collide with object prototypes during migration',()=>{
  localStorage.setItem('tcds_revisions',JSON.stringify([{id:'legacy',tcds_number:'__proto__',timestamp:'2026-01-01',revision:'1',revision_date:'2026-01-01',model:'example',status:'current',url:'https://example.com',content_hash:'old',content_length:1}]));
  expect(getRevisionsByTCDS('2A13')).toEqual([]);expect(localStorage.getItem('tcds_revisions')).toContain('__proto__');
 });
 it('recovers from denied storage without crashing and reports quota errors without clearing old data',()=>{
  vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw new Error('denied');});expect(listGroups()).toEqual([]);expect(getIssues()).toEqual([]);expect(getRevisionsByTCDS('2A13')).toEqual([]);vi.restoreAllMocks();
  createGroup(['2A13','A16WE']);const before=localStorage.getItem('tcds_cross_references');vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('quota');});expect(()=>createGroup(['TEST'])).toThrow('preserved');expect(localStorage.getItem('tcds_cross_references')).toBe(before);
 });
});
