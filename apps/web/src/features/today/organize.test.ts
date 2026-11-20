import { describe, expect, it } from 'vitest';
import type { Feature } from '@forge-org/api-client';
import { organizeDefaults, parseTags, planOrganize, tagsProblem } from './organize';
import type { TodayItem } from './todayModel';

function item(overrides: Partial<Feature> = {}): TodayItem {
  const feature = {
    id: 'f1',
    title: 'Fix login',
    project_id: 'inbox',
    epic_id: null,
    priority: 'medium',
    status: 'backlog',
    kind: 'story',
    tags: ['auth'],
    bug_severity: null,
    ...overrides,
  } as Feature;
  return { feature, workspaceId: 'w1', projectId: 'inbox', projectName: 'Inbox' };
}

const same = (target: TodayItem) => organizeDefaults(target.feature, target.projectId);

describe('parseTags', () => {
  it('trims, drops empties and case-insensitive duplicates, keeping the first spelling', () => {
    expect(parseTags(' Auth, ui ,, AUTH ,Platform ')).toEqual(['Auth', 'ui', 'Platform']);
    expect(parseTags('')).toEqual([]);
  });

  it('reports tags the API would reject', () => {
    expect(tagsProblem('a, b')).toBeNull();
    expect(tagsProblem(Array.from({ length: 21 }, (_, i) => `t${i}`).join(','))).toMatch(
      /at most 20/,
    );
    expect(tagsProblem('x'.repeat(41))).toMatch(/up to 40/);
  });
});

describe('planOrganize', () => {
  it('does nothing when nothing changed', () => {
    const target = item();
    expect(planOrganize(target, same(target))).toEqual({ move: null, update: null });
  });

  it('assigns an Epic inside the same project with a plain update', () => {
    const target = item();
    expect(planOrganize(target, { ...same(target), epicId: 'e1' })).toEqual({
      move: null,
      update: { epic_id: 'e1' },
    });
  });

  it('clears the Epic explicitly', () => {
    const target = item({ epic_id: 'e1' });
    expect(planOrganize(target, { ...same(target), epicId: '' }).update).toEqual({
      clear_epic: true,
    });
  });

  it('moves to another project and lets the move carry the Epic', () => {
    const target = item();
    const plan = planOrganize(target, { ...same(target), projectId: 'atlas', epicId: 'e9' });
    expect(plan.move).toEqual({ projectId: 'atlas', epicId: 'e9' });
    expect(plan.update).toBeNull();
  });

  it('combines a move with priority and tag changes applied afterwards', () => {
    const target = item();
    const plan = planOrganize(target, {
      ...same(target),
      projectId: 'atlas',
      priority: 'high',
      tags: 'auth, urgent',
    });
    expect(plan.move).toEqual({ projectId: 'atlas', epicId: null });
    expect(plan.update).toEqual({ priority: 'high', tags: ['auth', 'urgent'] });
  });

  it('turns a Story into a Bug with a default severity, and back without one', () => {
    const story = item();
    expect(planOrganize(story, { ...same(story), kind: 'bug' }).update).toEqual({
      kind: 'bug',
      bug_severity: 'medium',
    });
    const bug = item({ kind: 'bug', bug_severity: 'high' });
    expect(planOrganize(bug, { ...same(bug), kind: 'story' }).update).toEqual({
      kind: 'story',
      bug_severity: null,
    });
  });

  it('keeps an existing Bug severity when only other fields change', () => {
    const bug = item({ kind: 'bug', bug_severity: 'high' });
    expect(planOrganize(bug, { ...same(bug), priority: 'low' }).update).toEqual({
      priority: 'low',
    });
  });
});
