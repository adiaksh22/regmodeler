import {describe,it,expect} from 'vitest';
import {officialReviewedRecord} from './sourceQuality';
describe('source-quality record links',()=>{
 it('links only to exact FAA record paths',()=>{
  expect(officialReviewedRecord('https://drs.faa.gov/browse/excelExternalWindow/REVIEWED.0001')).toContain('REVIEWED.0001');
  for(const url of ['javascript:alert(1)','https://drs.faa.gov.evil.example/browse/excelExternalWindow/ID.0001','https://drs.faa.gov/browse/excelExternalWindow/ID.0001?secret=x','https://user@drs.faa.gov/browse/excelExternalWindow/ID.0001'])expect(officialReviewedRecord(url)).toBeNull();
 });
});
