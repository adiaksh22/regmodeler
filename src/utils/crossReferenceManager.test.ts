import { describe, it, expect, beforeEach } from 'vitest';
import { createGroup, addToGroup, removeFromGroup, listGroups, getGroup, getGroupByMember, deleteGroup } from './crossReferenceManager';

describe('crossReferenceManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should create a new group', () => {
    const group = createGroup(['P19NE', 'E7CE'], 'manual');

    expect(group.group_id).toBeTruthy();
    expect(group.members).toEqual(['P19NE', 'E7CE']);
    expect(group.method).toBe('manual');
    expect(group.created_at).toBeTruthy();
    expect(group.updated_at).toBeTruthy();
  });

  it('should normalize tcds numbers to uppercase', () => {
    const group = createGroup(['p19ne', 'e7ce']);
    expect(group.members).toEqual(['P19NE', 'E7CE']);
  });

  it('should list all groups', () => {
    createGroup(['P19NE', 'E7CE']);
    createGroup(['A14SO', 'A-804']);

    const groups = listGroups();
    expect(groups).toHaveLength(2);
  });

  it('should get group by id', () => {
    const created = createGroup(['P19NE', 'E7CE']);
    const retrieved = getGroup(created.group_id);

    expect(retrieved).toBeTruthy();
    expect(retrieved?.group_id).toBe(created.group_id);
  });

  it('should get group by member', () => {
    createGroup(['P19NE', 'E7CE']);

    const group = getGroupByMember('P19NE');
    expect(group).toBeTruthy();
    expect(group?.members).toContain('P19NE');
    expect(group?.members).toContain('E7CE');
  });

  it('should add member to existing group', () => {
    const group = createGroup(['P19NE', 'E7CE']);
    const success = addToGroup(group.group_id, 'A14SO');

    expect(success).toBe(true);

    const updated = getGroup(group.group_id);
    expect(updated?.members).toHaveLength(3);
    expect(updated?.members).toContain('A14SO');
  });

  it('should not add duplicate members', () => {
    const group = createGroup(['P19NE', 'E7CE']);
    addToGroup(group.group_id, 'P19NE');

    const updated = getGroup(group.group_id);
    expect(updated?.members).toHaveLength(2);
  });

  it('should remove member from group', () => {
    const group = createGroup(['P19NE', 'E7CE', 'A14SO']);
    const success = removeFromGroup(group.group_id, 'E7CE');

    expect(success).toBe(true);

    const updated = getGroup(group.group_id);
    expect(updated?.members).toHaveLength(2);
    expect(updated?.members).not.toContain('E7CE');
  });

  it('should delete group when last member removed', () => {
    const group = createGroup(['P19NE']);
    removeFromGroup(group.group_id, 'P19NE');

    const retrieved = getGroup(group.group_id);
    expect(retrieved).toBeNull();
  });

  it('should delete group by id', () => {
    const group = createGroup(['P19NE', 'E7CE']);
    const success = deleteGroup(group.group_id);

    expect(success).toBe(true);
    expect(getGroup(group.group_id)).toBeNull();
  });

  it('should handle auto method with confidence', () => {
    const group = createGroup(['P19NE', 'E7CE'], 'auto', 0.95);

    expect(group.method).toBe('auto');
    expect(group.confidence).toBe(0.95);
  });
});
