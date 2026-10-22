const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const isPeriodApplicable = (day, period, weekdayConfig = {}) => {
  const dayType = weekdayConfig[day] || 'Weekday';
  if (dayType === 'Holiday Weekend') return false;
  if (dayType === 'Working Weekend') return period.applicable_on_weekends === true;
  return true;
};

const toMinutes = (time) => {
  if (!time) return null;
  const [hours, minutes] = String(time).split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};

const isWithinFemaleWorkWindow = (period) => {
  const start = toMinutes(period.start_time);
  const end = toMinutes(period.end_time);
  return start !== null && end !== null && start >= 9 * 60 && end <= 16 * 60 + 10;
};

export const mergeTeacherTimeBlocks = (configuredBlocks = [], savedBlocks = []) => {
  const blockKey = (block) =>
    [
      block.teacher_id,
      block.day,
      block.period_id,
    ].join('|');
  const savedKeys = new Set(savedBlocks.map(blockKey));
  return [
    ...configuredBlocks.filter(
      (block) => block.period_id != null && !savedKeys.has(blockKey(block))
    ),
    ...savedBlocks,
  ];
};

export const isTeacherAvailable = ({
  teacher,
  day,
  period,
  availability = {},
  availabilityCategories = [],
  categoryAssignments = {},
  timeBlocks = [],
}) => {
  if (!teacher || !period) return false;
  const categoryId = categoryAssignments[String(teacher.id)];
  const category = availabilityCategories.find(
    (item) => String(item.id) === String(categoryId)
  );
  const categoryDay = category?.periods?.[day];
  const configuredDay = availability[String(teacher.id)]?.[day];
  const available = categoryId
    ? Array.isArray(categoryDay) &&
      categoryDay.some((periodNumber) => Number(periodNumber) === Number(period.period_number))
    : Array.isArray(configuredDay)
      ? configuredDay.some((periodNumber) => Number(periodNumber) === Number(period.period_number))
      : teacher.is_male === false
        ? isWithinFemaleWorkWindow(period)
        : true;

  if (!available) return false;

  return !timeBlocks.some(
    (block) =>
      String(block.teacher_id) === String(teacher.id) &&
      String(block.period_id) === String(period.id) &&
      (block.day === day || block.day === 'Every day')
  );
};

export { DAYS };
