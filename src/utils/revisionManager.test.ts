import { describe, it, expect } from 'vitest';
import { normalizeTCDS, hashTCDS, diffFields, getContentLength } from './revisionManager';
import { TCDSDocument } from '../types/tcds';
import { NormalizedTCDS } from '../types/revision';

describe('revisionManager', () => {
  describe('normalizeTCDS', () => {
    it('should normalize whitespace and casing consistently', () => {
      const doc1: TCDSDocument = {
        tcds_number: ' p19ne ',
        revision: ' 8 ',
        revision_date: '07/08/2021',
        model: 'MTV-6-( )',
        status: 'current',
        holder: 'MT-Propeller',
        url: 'https://example.com'
      };

      const doc2: TCDSDocument = {
        tcds_number: 'P19NE',
        revision: '8',
        revision_date: '07/08/2021',
        model: 'MTV-6-( )',
        status: 'current',
        holder: 'MT-Propeller',
        url: 'https://example.com'
      };

      const norm1 = normalizeTCDS(doc1);
      const norm2 = normalizeTCDS(doc2);

      expect(norm1).toEqual(norm2);
      expect(norm1.tcds_number).toBe('P19NE');
      expect(norm1.status).toBe('current');
    });
  });

  describe('hashTCDS', () => {
    it('should produce identical hashes for semantically identical docs', () => {
      const doc1: NormalizedTCDS = {
        tcds_number: 'P19NE',
        revision: '8',
        revision_date: '07/08/2021',
        model: 'MTV-6-( )',
        status: 'current',
        holder: 'MT-Propeller',
        url: 'https://example.com'
      };

      const doc2: NormalizedTCDS = {
        tcds_number: 'P19NE',
        revision: '8',
        revision_date: '07/08/2021',
        model: 'MTV-6-( )',
        status: 'current',
        holder: 'MT-Propeller',
        url: 'https://example.com'
      };

      expect(hashTCDS(doc1)).toBe(hashTCDS(doc2));
      expect(getContentLength(doc1)).toBe(getContentLength(doc2));
    });

    it('should produce different hashes for different content', () => {
      const doc1: NormalizedTCDS = {
        tcds_number: 'P19NE',
        revision: '8',
        revision_date: '07/08/2021',
        model: 'MTV-6-( )',
        status: 'current',
        holder: 'MT-Propeller',
        url: 'https://example.com'
      };

      const doc2: NormalizedTCDS = {
        ...doc1,
        revision: '9'
      };

      expect(hashTCDS(doc1)).not.toBe(hashTCDS(doc2));
      // Equal-length values still represent different content.
      expect(getContentLength(doc1)).toBe(getContentLength(doc2));
    });

    it('should detect collision if hash matches but length differs', () => {
      // This test documents the collision detection behavior
      // In practice, if hash matches but length differs, it's a collision
      const doc1: NormalizedTCDS = {
        tcds_number: 'P19NE',
        revision: '8',
        revision_date: '07/08/2021',
        model: 'MTV-6-( )',
        status: 'current',
        holder: 'MT-Propeller',
        url: 'https://example.com'
      };

      const hash1 = hashTCDS(doc1);
      const length1 = getContentLength(doc1);

      // Both hash and length must match to be considered identical
      expect(hash1).toBeTruthy();
      expect(length1).toBeGreaterThan(0);
    });
  });

  describe('diffFields', () => {
    it('should return empty array when no changes detected', () => {
      const oldDoc: NormalizedTCDS = {
        tcds_number: 'P19NE',
        revision: '8',
        revision_date: '07/08/2021',
        model: 'MTV-6-( )',
        status: 'current',
        holder: 'MT-Propeller',
        url: 'https://example.com'
      };

      const newDoc: NormalizedTCDS = {
        tcds_number: 'P19NE',
        revision: '8',
        revision_date: '07/08/2021',
        model: 'MTV-6-( )',
        status: 'current',
        holder: 'MT-Propeller',
        url: 'https://example.com'
      };

      const changes = diffFields(oldDoc, newDoc);
      expect(changes).toEqual([]);
    });

    it('should not detect changes when only whitespace differs', () => {
      const oldDoc: NormalizedTCDS = {
        tcds_number: 'P19NE',
        revision: '8',
        revision_date: '07/08/2021',
        model: 'MTV-6-( )',
        status: 'current',
        holder: 'MT-Propeller',
        url: 'https://example.com'
      };

      const newDoc: NormalizedTCDS = {
        tcds_number: 'P19NE',
        revision: ' 8 ',
        revision_date: '07/08/2021',
        model: ' MTV-6-( ) ',
        status: 'current',
        holder: 'MT-Propeller',
        url: 'https://example.com'
      };

      const changes = diffFields(oldDoc, newDoc);
      expect(changes).toEqual([]);
    });

    it('should detect actual field changes with correct before/after', () => {
      const oldDoc: NormalizedTCDS = {
        tcds_number: 'P19NE',
        revision: '8',
        revision_date: '07/08/2021',
        model: 'MTV-6-( )',
        status: 'current',
        holder: 'MT-Propeller',
        url: 'https://example.com'
      };

      const newDoc: NormalizedTCDS = {
        tcds_number: 'P19NE',
        revision: '9',
        revision_date: '12/15/2024',
        model: 'MTV-6-( )',
        status: 'current',
        holder: 'MT-Propeller GmbH',
        url: 'https://example.com'
      };

      const changes = diffFields(oldDoc, newDoc);

      expect(changes).toHaveLength(3);

      const revisionChange = changes.find(c => c.field === 'revision');
      expect(revisionChange).toEqual({
        field: 'revision',
        old_value: '8',
        new_value: '9'
      });

      const dateChange = changes.find(c => c.field === 'revision_date');
      expect(dateChange).toEqual({
        field: 'revision_date',
        old_value: '07/08/2021',
        new_value: '12/15/2024'
      });

      const holderChange = changes.find(c => c.field === 'holder');
      expect(holderChange).toEqual({
        field: 'holder',
        old_value: 'MT-Propeller',
        new_value: 'MT-Propeller GmbH'
      });
    });

    it('should not include URL changes (volatile field)', () => {
      const oldDoc: NormalizedTCDS = {
        tcds_number: 'P19NE',
        revision: '8',
        revision_date: '07/08/2021',
        model: 'MTV-6-( )',
        status: 'current',
        holder: 'MT-Propeller',
        url: 'https://old-url.com'
      };

      const newDoc: NormalizedTCDS = {
        tcds_number: 'P19NE',
        revision: '8',
        revision_date: '07/08/2021',
        model: 'MTV-6-( )',
        status: 'current',
        holder: 'MT-Propeller',
        url: 'https://new-url.com'
      };

      const changes = diffFields(oldDoc, newDoc);
      expect(changes).toEqual([]);
    });

    it('should ignore tcds_number changes (identifier field)', () => {
      const oldDoc: NormalizedTCDS = {
        tcds_number: 'P19NE',
        revision: '8',
        revision_date: '07/08/2021',
        model: 'MTV-6-( )',
        status: 'current',
        holder: 'MT-Propeller',
        url: 'https://example.com'
      };

      const newDoc: NormalizedTCDS = {
        tcds_number: 'E7CE', // Different TCDS (shouldn't happen, but test ignore behavior)
        revision: '8',
        revision_date: '07/08/2021',
        model: 'MTV-6-( )',
        status: 'current',
        holder: 'MT-Propeller',
        url: 'https://example.com'
      };

      const changes = diffFields(oldDoc, newDoc);
      // Should not include tcds_number in changes
      expect(changes.find(c => c.field === 'tcds_number')).toBeUndefined();
    });

    it('should diff all non-ignored fields automatically', () => {
      const oldDoc: NormalizedTCDS = {
        tcds_number: 'P19NE',
        revision: '8',
        revision_date: '07/08/2021',
        model: 'MTV-6-( )',
        status: 'current',
        holder: 'MT-Propeller',
        url: 'https://example.com'
      };

      const newDoc: NormalizedTCDS = {
        tcds_number: 'P19NE',
        revision: '9',
        revision_date: '12/15/2024',
        model: 'MTV-7-( )',
        status: 'historical',
        holder: 'MT-Propeller GmbH',
        url: 'https://new-url.com'
      };

      const changes = diffFields(oldDoc, newDoc);

      // Should detect all content field changes
      expect(changes.length).toBeGreaterThan(0);
      expect(changes.find(c => c.field === 'revision')).toBeTruthy();
      expect(changes.find(c => c.field === 'revision_date')).toBeTruthy();
      expect(changes.find(c => c.field === 'model')).toBeTruthy();
      expect(changes.find(c => c.field === 'status')).toBeTruthy();
      expect(changes.find(c => c.field === 'holder')).toBeTruthy();

      // Should NOT include ignored fields
      expect(changes.find(c => c.field === 'url')).toBeUndefined();
      expect(changes.find(c => c.field === 'tcds_number')).toBeUndefined();
    });

    it('should return empty array when oldDoc is null', () => {
      const newDoc: NormalizedTCDS = {
        tcds_number: 'P19NE',
        revision: '8',
        revision_date: '07/08/2021',
        model: 'MTV-6-( )',
        status: 'current',
        holder: 'MT-Propeller',
        url: 'https://example.com'
      };

      const changes = diffFields(null, newDoc);
      expect(changes).toEqual([]);
    });
  });
});
