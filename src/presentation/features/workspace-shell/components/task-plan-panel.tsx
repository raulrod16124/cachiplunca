import { Badge, Checkbox, Heading, IconButton, Select, Text } from '@raulrod/ui';
import { ClipboardList, X } from '@raulrod/icons';
import { useMemo, useState, type ReactNode } from 'react';
import styled from 'styled-components';
import type { Element, TaskElement, TaskStatus } from '../../../../domain/element';
import { TASK_STATUSES, isTaskElement, richTextToPlain } from '../../../../domain/element';
import type { TaskPlanStatusFilter } from '../../../../application/services';
import { selectTaskPlan } from '../../../../application/services';
import { TASK_STATUS_META } from '../../../canvas/renderers/task-status-meta';
import { EmptyState } from '../../../components/empty-state';
import { shortUserId } from '../../../collaboration';
import { formatShortDate, useI18n, type TranslationKey } from '../../../i18n';

const STATUS_LABEL_KEYS: Record<TaskStatus, TranslationKey> = {
  todo: 'plan.status.todo',
  in_progress: 'plan.status.in_progress',
  completed: 'plan.status.completed',
  blocked: 'plan.status.blocked',
};

const Panel = styled.aside`
  flex: 0 0 clamp(280px, 24vw, 360px);
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: ${({ theme }) => theme.canvas.surface};
  border-left: 1px solid ${({ theme }) => theme.canvas.elementBorder};
  box-shadow: ${({ theme }) => theme.shadow.sm};
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => theme.space[4]};
  border-bottom: 1px solid ${({ theme }) => theme.canvas.elementBorderSoft};
`;

const HeaderIdentity = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  min-width: 0;
`;

const Filters = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  flex-wrap: wrap;
  padding: ${({ theme }) => `${theme.space[3]} ${theme.space[4]}`};
  border-bottom: 1px solid ${({ theme }) => theme.canvas.elementBorderSoft};
`;

const MineFilter = styled.label`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  cursor: pointer;
`;

const Body = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: ${({ theme }) => theme.space[4]};
`;

const Groups = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[5]};
`;

const GroupHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  margin-bottom: ${({ theme }) => theme.space[2]};
`;

const TaskList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
  margin: 0;
  padding: 0;
  list-style: none;
`;

const TaskRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[2]};
  padding: ${({ theme }) => theme.space[3]};
  border: 1px solid ${({ theme }) => theme.color.border.default};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.background.surface};
`;

const TaskButton = styled.button`
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[1]};
  padding: 0;
  border: none;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focusRing};
    outline-offset: 2px;
  }
`;

const TaskTitle = styled.span`
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  word-break: break-word;
`;

const MetaRow = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const StatusControl = styled.div`
  flex: none;
`;

export interface TaskPlanPanelProps {
  readonly open: boolean;
  readonly elements: readonly Element[];
  readonly currentUserId: string | undefined;
  readonly canEdit: boolean;
  readonly canCreateTask: boolean;
  readonly onClose: () => void;
  readonly onSelectTask: (elementId: string) => void;
  readonly onChangeStatus: (task: TaskElement, status: TaskStatus) => void;
  readonly onCreateTask: () => void;
}

export function TaskPlanPanel({
  open,
  elements,
  currentUserId,
  canEdit,
  canCreateTask,
  onClose,
  onSelectTask,
  onChangeStatus,
  onCreateTask,
}: TaskPlanPanelProps): ReactNode {
  const { t, locale } = useI18n();
  const [statusFilter, setStatusFilter] = useState<TaskPlanStatusFilter>('all');
  const [onlyMine, setOnlyMine] = useState(false);

  const groups = useMemo(
    () => selectTaskPlan(elements, { status: statusFilter, onlyMine, currentUserId }),
    [currentUserId, elements, onlyMine, statusFilter],
  );
  const hasAnyTask = useMemo(() => elements.some(isTaskElement), [elements]);

  if (!open) {
    return null;
  }

  const clearFilters = (): void => {
    setStatusFilter('all');
    setOnlyMine(false);
  };

  return (
    <Panel id="task-plan-panel" aria-label={t('plan.title')} data-testid="task-plan-panel">
      <Header>
        <HeaderIdentity>
          <ClipboardList aria-hidden="true" size={18} />
          <Heading as="h2">{t('plan.title')}</Heading>
        </HeaderIdentity>
        <IconButton
          type="button"
          variant="ghost"
          size="sm"
          label={t('plan.close')}
          onClick={onClose}
        >
          <X aria-hidden="true" size={16} />
        </IconButton>
      </Header>
      <Filters>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as TaskPlanStatusFilter)}
        >
          <Select.Trigger size="sm" aria-label={t('plan.filter.status')}>
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="all">{t('plan.filter.all')}</Select.Item>
            {TASK_STATUSES.map((status) => (
              <Select.Item key={status} value={status}>
                {t(STATUS_LABEL_KEYS[status])}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
        <MineFilter>
          <Checkbox checked={onlyMine} onChange={(event) => setOnlyMine(event.target.checked)} />
          <Text size="font.size.sm">{t('plan.filter.mine')}</Text>
        </MineFilter>
      </Filters>
      <Body>
        {groups.length === 0 ? (
          <EmptyState
            title={hasAnyTask ? t('plan.emptyFiltered.title') : t('plan.empty.title')}
            description={
              hasAnyTask ? t('plan.emptyFiltered.description') : t('plan.empty.description')
            }
            actionLabel={
              hasAnyTask
                ? t('plan.clearFilters')
                : canCreateTask
                  ? t('plan.empty.action')
                  : undefined
            }
            onAction={hasAnyTask ? clearFilters : canCreateTask ? onCreateTask : undefined}
          />
        ) : (
          <Groups>
            {groups.map((group) => (
              <section key={group.status} aria-labelledby={`task-plan-group-${group.status}`}>
                <GroupHeader>
                  <Heading as="h3" id={`task-plan-group-${group.status}`}>
                    {t(STATUS_LABEL_KEYS[group.status])}
                  </Heading>
                  <Badge variant="neutral">{group.tasks.length}</Badge>
                </GroupHeader>
                <TaskList>
                  {group.tasks.map((task) => {
                    const title = richTextToPlain(task.title);
                    const assignee =
                      task.assigneeId === undefined
                        ? t('plan.unassigned')
                        : t('plan.assignee', { name: shortUserId(task.assigneeId.value) });
                    const dueDate =
                      task.dueDate === undefined
                        ? t('plan.noDueDate')
                        : t('plan.due', { date: formatShortDate(task.dueDate, locale) });

                    return (
                      <li key={task.id.value}>
                        <TaskRow>
                          <TaskButton
                            type="button"
                            aria-label={t('plan.selectTask', { title })}
                            onClick={() => onSelectTask(task.id.value)}
                          >
                            <TaskTitle>{title}</TaskTitle>
                            <MetaRow>
                              <Text color="color.text.muted" size="font.size.xs">
                                {assignee}
                              </Text>
                              <Text color="color.text.muted" size="font.size.xs">
                                {dueDate}
                              </Text>
                            </MetaRow>
                          </TaskButton>
                          <StatusControl>
                            {canEdit ? (
                              <Select
                                value={task.status}
                                onValueChange={(value) => {
                                  if (value !== task.status) {
                                    onChangeStatus(task, value as TaskStatus);
                                  }
                                }}
                              >
                                <Select.Trigger
                                  size="sm"
                                  aria-label={t('plan.changeStatus', { title })}
                                >
                                  <Select.Value />
                                </Select.Trigger>
                                <Select.Content>
                                  {TASK_STATUSES.map((status) => (
                                    <Select.Item key={status} value={status}>
                                      {t(STATUS_LABEL_KEYS[status])}
                                    </Select.Item>
                                  ))}
                                </Select.Content>
                              </Select>
                            ) : (
                              <Badge variant={TASK_STATUS_META[task.status].variant}>
                                {t(STATUS_LABEL_KEYS[task.status])}
                              </Badge>
                            )}
                          </StatusControl>
                        </TaskRow>
                      </li>
                    );
                  })}
                </TaskList>
              </section>
            ))}
          </Groups>
        )}
      </Body>
    </Panel>
  );
}
