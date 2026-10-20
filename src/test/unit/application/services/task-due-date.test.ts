import {
  isTaskOverdue,
  parseTaskDueDateInput,
  taskDueDateInputValue,
} from '../../../../application/services/task-due-date';

describe('task due date helpers', () => {
  it('converts a due date to the date input value', () => {
    expect(taskDueDateInputValue(new Date('2026-03-15T00:00:00.000Z'))).toBe('2026-03-15');
    expect(taskDueDateInputValue(undefined)).toBe('');
  });

  it('parses a valid date input into a UTC calendar date', () => {
    expect(parseTaskDueDateInput('2026-03-15')?.toISOString()).toBe('2026-03-15T00:00:00.000Z');
    expect(parseTaskDueDateInput('')).toBeUndefined();
    expect(parseTaskDueDateInput('   ')).toBeUndefined();
  });

  it('rejects malformed or impossible dates', () => {
    expect(() => parseTaskDueDateInput('15/03/2026')).toThrow(/YYYY-MM-DD/);
    expect(() => parseTaskDueDateInput('2026-02-30')).toThrow(/valid calendar date/);
  });

  it('marks dates before today as overdue', () => {
    const now = new Date(2026, 9, 20, 12, 0, 0);

    expect(isTaskOverdue(new Date('2026-10-19T00:00:00.000Z'), now)).toBe(true);
    expect(isTaskOverdue(new Date('2026-10-20T00:00:00.000Z'), now)).toBe(false);
    expect(isTaskOverdue(new Date('2026-10-21T00:00:00.000Z'), now)).toBe(false);
  });
});
