const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function taskDueDateInputValue(dueDate: Date | undefined): string {
  return dueDate === undefined ? '' : dueDate.toISOString().slice(0, 10);
}

export function parseTaskDueDateInput(value: string): Date | undefined {
  const trimmed = value.trim();

  if (trimmed === '') {
    return undefined;
  }

  if (!DATE_INPUT_PATTERN.test(trimmed)) {
    throw new Error('Task due date must use the YYYY-MM-DD format');
  }

  const date = new Date(`${trimmed}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== trimmed) {
    throw new Error('Task due date must be a valid calendar date');
  }

  return date;
}

export function isTaskOverdue(dueDate: Date, now: Date = new Date()): boolean {
  return dueDate.toISOString().slice(0, 10) < localDateKey(now);
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
