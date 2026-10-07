import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCanAccess } from '../../../portal-shared/ConditionalBlock';
import {
  isManagementRole,
  canEditMarks as checkCanEditMarks,
  canPublishReport as checkCanPublishReport,
  canUploadAttendance as checkCanUploadAttendance,
  canUploadRemarks as checkCanUploadRemarks,
  isMatchingTeacher,
} from '../utils';

/**
 * Hook to manage access control based on user roles
 */
export const useAccessControl = ({
  userRoles = [],
  user = null,
  teacherRecord = null,
  teacherMap = {},
  classAssignments = [],
  selectedClassId = '',
  activeResults = [],
  activeSlots = {},
  isTeacherLocked = false,
}) => {
  const canAccess = useCanAccess(userRoles);

  // Capability driven strictly by management roles
  const canManageAllMarks = isManagementRole(userRoles);
  const canPublishReport = checkCanPublishReport(userRoles, canAccess);
  const canUploadAttendance = checkCanUploadAttendance(userRoles, canAccess);
  const canUploadRemarks = checkCanUploadRemarks(userRoles, canAccess);

  // Teacher matching
  const isMatchingTeacherFn = useCallback(
    (targetTeacherId) => isMatchingTeacher(targetTeacherId, teacherRecord, user, teacherMap),
    [teacherRecord, user, teacherMap]
  );

  // Allocated subject teacher
  const isAllocatedSubjectTeacherMap = useMemo(() => {
    const allocatedMap = {};
    if (!selectedClassId) return allocatedMap;
    activeResults.forEach((result) => {
      const isAssigned = classAssignments.some(
        (ca) =>
          String(ca.class_id) === String(selectedClassId) &&
          String(ca.subject_id) === String(result.subject_id) &&
          isMatchingTeacherFn(ca.teacher_id)
      );
      allocatedMap[result.id] = isAssigned;
      allocatedMap[String(result.id)] = isAssigned;
    });
    return allocatedMap;
  }, [isMatchingTeacherFn, selectedClassId, activeResults, classAssignments]);

  // Can edit marks for subject
  const canEditMarksForSubjectMap = useMemo(() => {
    const editMap = {};
    const canAccessMarkEntry = checkCanEditMarks(userRoles, canAccess);

    activeResults.forEach((result) => {
      // When progress report is published, marks editing is strictly locked for teachers
      if (isTeacherLocked) {
        editMap[result.id] = false;
        editMap[String(result.id)] = false;
        return;
      }

      if (!canAccessMarkEntry) {
        editMap[result.id] = false;
        editMap[String(result.id)] = false;
        return;
      }

      // Management can edit marks for any subject
      if (canManageAllMarks) {
        editMap[result.id] = true;
        editMap[String(result.id)] = true;
        return;
      }

      // For teachers: ONLY the assigned invigilator or allocated subject teacher
      const slot = activeSlots[String(result.id)] || activeSlots[result.id];
      const isInvigilator = Boolean(slot?.teacher_id && isMatchingTeacherFn(slot.teacher_id));
      const isSubjectTeacher = Boolean(
        isAllocatedSubjectTeacherMap[result.id] ?? isAllocatedSubjectTeacherMap[String(result.id)]
      );

      const canEdit = isInvigilator || isSubjectTeacher;
      editMap[result.id] = canEdit;
      editMap[String(result.id)] = canEdit;
    });
    return editMap;
  }, [
    activeResults,
    activeSlots,
    canAccess,
    userRoles,
    canManageAllMarks,
    isTeacherLocked,
    isMatchingTeacherFn,
    isAllocatedSubjectTeacherMap,
  ]);

  return {
    canAccess,
    canManageAllMarks,
    canPublishReport,
    canUploadAttendance,
    canUploadRemarks,
    isMatchingTeacher: isMatchingTeacherFn,
    isAllocatedSubjectTeacher: isAllocatedSubjectTeacherMap,
    canEditMarksForSubject: canEditMarksForSubjectMap,
  };
};