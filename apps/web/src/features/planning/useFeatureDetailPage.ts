import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { isTauri } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { organizationApi, type Feature } from '@forge-org/api-client';
import { useFeatureDetailController } from './useFeatureDetailController';

export function useFeatureDetailPage() {
  const [editing, setEditing] = useState(false);
  const [editingCriterionId, setEditingCriterionId] = useState<string | null>(null);
  const [criterionDraft, setCriterionDraft] = useState('');
  const [screenshotPickerError, setScreenshotPickerError] = useState<string | null>(null);
  const bugScreenshotInput = useRef<HTMLInputElement>(null);
  const { workspaceId = '', projectId = '', featureId = '' } = useParams();
  const {
    addCriterion,
    updateCriterion,
    removeCriterion,
    moveCriterion,
    addTask,
    changeTask,
    criteria,
    criterion,
    dependencies,
    error,
    feature,
    featureDescription,
    featureGoal,
    featureTitle,
    bugSeverity,
    setBugSeverity,
    stepsToReproduce,
    setStepsToReproduce,
    expectedResult,
    setExpectedResult,
    actualResult,
    setActualResult,
    featureTags,
    setFeatureTags,
    notes,
    setNotes,
    attachments,
    attachmentUrls,
    workspaceTags,
    uploadAttachment,
    removeAttachment,
    featureName,
    moveTask,
    saveFeature,
    reload,
    setCriterion,
    setFeatureTitle,
    setFeatureDescription,
    setFeatureGoal,
    setTaskTitle,
    taskTitle,
    tasks,
  } = useFeatureDetailController(workspaceId, projectId, featureId);

  async function chooseBugScreenshot() {
    setScreenshotPickerError(null);
    if (!isTauri()) {
      bugScreenshotInput.current?.click();
      return;
    }

    try {
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
      });
      if (!selected || Array.isArray(selected)) return;

      const fileName = selected.split(/[\\/]/).pop() || 'screenshot';
      const extension = fileName.split('.').pop()?.toLowerCase();
      const contentType =
        extension === 'png'
          ? 'image/png'
          : extension === 'jpg' || extension === 'jpeg'
            ? 'image/jpeg'
            : extension === 'webp'
              ? 'image/webp'
              : null;
      if (!contentType) {
        setScreenshotPickerError('Choose a PNG, JPEG, or WebP screenshot.');
        return;
      }

      const selectedBytes = await readFile(selected);
      const bytes = new Uint8Array(selectedBytes.length);
      bytes.set(selectedBytes);
      await uploadAttachment(new File([bytes.buffer], fileName, { type: contentType }));
    } catch {
      setScreenshotPickerError('Unable to select or read screenshot.');
    }
  }

  function toggleTag(tagName: string, checked: boolean) {
    const selected = new Set(
      featureTags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    );
    if (checked) selected.add(tagName);
    else selected.delete(tagName);
    setFeatureTags([...selected].join(', '));
  }

  async function submitFeature(event: FormEvent) {
    if (await saveFeature(event)) setEditing(false);
  }

  const archived = Boolean(feature?.archived_at);
  const isBug = feature?.kind === 'bug';
  const selectedTags = featureTags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  const knownTags = new Set(workspaceTags.map((tag) => tag.name));
  const legacyTags = selectedTags.filter((tag) => !knownTags.has(tag));
  const [parentEpic, setParentEpic] = useState<{ id: string; title: string } | null>(null);
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState('');
  const activeFeature = useRef(featureId);
  useEffect(() => {
    activeFeature.current = featureId;
  }, [featureId]);
  const parentId = feature?.epic_id;
  useEffect(() => {
    if (!parentId) return;
    let current = true;
    void organizationApi
      .planningOverview(workspaceId, projectId)
      .then((overview) => {
        const parent = overview.epics.find((item) => item.id === parentId);
        if (current && parent) setParentEpic({ id: parent.id, title: parent.title });
      })
      .catch(() => {
        /* Navigation remains available if the summary cannot load. */
      });
    return () => {
      current = false;
    };
  }, [workspaceId, projectId, parentId]);
  const epicName = parentEpic?.id === parentId ? parentEpic?.title : 'Epic board';
  async function moveStatus(status: Feature['status']) {
    if (!feature || archived || moving || editing || status === feature.status) return;
    const id = feature.id;
    setMoving(true);
    setMoveError('');
    try {
      await organizationApi.updateFeature(workspaceId, projectId, id, { status });
      if (activeFeature.current === id) await reload();
    } catch (cause) {
      if (activeFeature.current === id)
        setMoveError(cause instanceof Error ? cause.message : 'Unable to move work item.');
    } finally {
      if (activeFeature.current === id) setMoving(false);
    }
  }
  return {
    editing,
    setEditing,
    editingCriterionId,
    setEditingCriterionId,
    criterionDraft,
    setCriterionDraft,
    screenshotPickerError,
    bugScreenshotInput,
    workspaceId,
    projectId,
    featureId,
    addCriterion,
    updateCriterion,
    removeCriterion,
    moveCriterion,
    addTask,
    changeTask,
    criteria,
    criterion,
    dependencies,
    error,
    feature,
    featureDescription,
    featureGoal,
    featureTitle,
    bugSeverity,
    setBugSeverity,
    stepsToReproduce,
    setStepsToReproduce,
    expectedResult,
    setExpectedResult,
    actualResult,
    setActualResult,
    notes,
    setNotes,
    attachments,
    attachmentUrls,
    workspaceTags,
    uploadAttachment,
    removeAttachment,
    featureName,
    moveTask,
    reload,
    setCriterion,
    setFeatureTitle,
    setFeatureDescription,
    setFeatureGoal,
    setTaskTitle,
    taskTitle,
    tasks,
    chooseBugScreenshot,
    toggleTag,
    submitFeature,
    archived,
    isBug,
    selectedTags,
    legacyTags,
    moving,
    moveError,
    epicName,
    moveStatus,
  };
}
