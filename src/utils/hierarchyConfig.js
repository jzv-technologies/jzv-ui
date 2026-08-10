export const HIERARCHY_TYPES = {
  UNIT: {
    name: 'Unit',
    canBeLevel1: true,
    canBeFinal: false,
    allowedNext: [
      'CHAPTER',
      'MODULE',
      'TITLE',
      'SECTION',
      'TOPIC',
      'HEADING',
      'SUB_HEADING',
      'LESSON',
    ],
  },
  MODULE: {
    name: 'Module',
    canBeLevel1: true,
    canBeFinal: false,
    allowedNext: [
      'UNIT',
      'CHAPTER',
      'TITLE',
      'SECTION',
      'TOPIC',
      'HEADING',
      'SUB_HEADING',
      'LESSON',
    ],
  },
  CHAPTER: {
    name: 'Chapter',
    canBeLevel1: true,
    canBeFinal: false,
    allowedNext: [
      'SECTION',
      'TITLE',
      'TOPIC',
      'HEADING',
      'SUB_HEADING',
      'LESSON',
    ],
  },
  TITLE: {
    name: 'Title',
    canBeLevel1: true,
    canBeFinal: true,
    allowedNext: [
      'SECTION',
      'TOPIC',
      'HEADING',
      'SUB_HEADING',
      'LESSON',
    ],
  },
  SECTION: {
    name: 'Section',
    canBeLevel1: true,
    canBeFinal: false,
    allowedNext: [
      'TOPIC',
      'HEADING',
      'SUB_HEADING',
      'LESSON',
    ],
  },
  TOPIC: {
    name: 'Topic',
    canBeLevel1: true,
    canBeFinal: true,
    allowedNext: [
      'HEADING',
      'SUB_HEADING',
      'LESSON',
    ],
  },
  HEADING: {
    name: 'Heading',
    canBeLevel1: true,
    canBeFinal: true,
    allowedNext: [
      'SUB_HEADING',
      'TOPIC',
      'LESSON',
    ],
  },
  SUB_HEADING: {
    name: 'Sub Heading',
    canBeLevel1: true,
    canBeFinal: true,
    allowedNext: [
      'TOPIC',
      'LESSON',
    ],
  },
  LESSON: {
    name: 'Lesson',
    canBeLevel1: true,
    canBeFinal: true,
    allowedNext: [],
  },
};

export const NOT_AVAILABLE = 'Not Available';

export const getLevel1Options = () => {
  return Object.keys(HIERARCHY_TYPES)
    .filter((key) => HIERARCHY_TYPES[key].canBeLevel1)
    .map((key) => ({ key, name: HIERARCHY_TYPES[key].name }));
};

export const getLevel2Options = (level1Key) => {
  if (!level1Key || !HIERARCHY_TYPES[level1Key]) return [];
  const l1Obj = HIERARCHY_TYPES[level1Key];
  const options = [];
  if (l1Obj.canBeFinal) {
    options.push({ key: 'NONE', name: NOT_AVAILABLE });
  }
  l1Obj.allowedNext.forEach((nextKey) => {
    if (HIERARCHY_TYPES[nextKey]) {
      options.push({ key: nextKey, name: HIERARCHY_TYPES[nextKey].name });
    }
  });
  return options;
};

export const getLevel3Options = (level2Key) => {
  if (!level2Key || level2Key === 'NONE' || !HIERARCHY_TYPES[level2Key]) {
    return [{ key: 'NONE', name: NOT_AVAILABLE }];
  }
  const l2Obj = HIERARCHY_TYPES[level2Key];
  const options = [];
  if (l2Obj.canBeFinal) {
    options.push({ key: 'NONE', name: NOT_AVAILABLE });
  }
  l2Obj.allowedNext.forEach((nextKey) => {
    if (HIERARCHY_TYPES[nextKey]) {
      options.push({ key: nextKey, name: HIERARCHY_TYPES[nextKey].name });
    }
  });
  return options;
};

export const parseHierarchyType = (hierarchyStr) => {
  if (!hierarchyStr) return { l1: 'UNIT', l2: 'CHAPTER', l3: 'LESSON', levelsAvailable: 3 };
  let cleaned = String(hierarchyStr).trim();
  if (cleaned.startsWith('Book > ')) cleaned = cleaned.replace('Book > ', '');
  const parts = cleaned.split(',').map((s) => s.trim());

  const findKeyByName = (name) => {
    if (!name || name === NOT_AVAILABLE || name.toLowerCase().includes('not available') || name === 'NONE') return 'NONE';
    const found = Object.keys(HIERARCHY_TYPES).find(
      (k) => HIERARCHY_TYPES[k].name.toLowerCase() === name.toLowerCase() || k.toLowerCase() === name.toLowerCase()
    );
    return found || 'NONE';
  };

  const l1Key = findKeyByName(parts[0]) !== 'NONE' ? findKeyByName(parts[0]) : 'UNIT';
  const l2Key = parts[1] ? findKeyByName(parts[1]) : 'NONE';
  const l3Key = parts[2] ? findKeyByName(parts[2]) : 'NONE';

  let levelsAvailable = 3;
  if (l2Key === 'NONE') levelsAvailable = 1;
  else if (l3Key === 'NONE') levelsAvailable = 2;

  return { l1: l1Key, l2: l2Key, l3: l3Key, levelsAvailable };
};

export const formatHierarchyType = (l1Key, l2Key, l3Key) => {
  const l1Name = HIERARCHY_TYPES[l1Key]?.name || 'Unit';
  const l2Name = l2Key && l2Key !== 'NONE' ? HIERARCHY_TYPES[l2Key]?.name : null;
  const l3Name = l3Key && l3Key !== 'NONE' ? HIERARCHY_TYPES[l3Key]?.name : null;

  const names = [l1Name];
  if (l2Name) names.push(l2Name);
  if (l3Name) names.push(l3Name);
  return names.join(', ');
};

export const getLevelsAvailableFromHierarchy = (hierarchyStr, storedLevelsAvailable) => {
  if (storedLevelsAvailable && [1, 2, 3].includes(Number(storedLevelsAvailable))) {
    return Number(storedLevelsAvailable);
  }
  const parsed = parseHierarchyType(hierarchyStr);
  return parsed.levelsAvailable;
};
