import { Badge, Checkbox, DropdownMenu, Heading, Select, Tabs, Text } from '@raulrod/ui';
import { Check, ClipboardList, Ellipsis } from '@raulrod/icons';
import { Fragment, useMemo, useState, type ReactNode } from 'react';
import styled from 'styled-components';
import type { Element, TaskElement, TaskStatus } from '../../../../domain/element';
import { TASK_STATUSES, isTaskElement, richTextToPlain } from '../../../../domain/element';
import type { TaskPlanStatusFilter } from '../../../../application/services';
import {
  isTaskOverdue,
  selectTaskPlan,
  selectTaskPlanBoard,
} from '../../../../application/services';
import type { TaskAssigneeOption } from '../../../canvas/components/task-form-dialog';
import {
  TASK_STATUS_LABEL_KEYS,
  TASK_STATUS_META,
} from '../../../canvas/renderers/task-status-meta';
import { EmptyState } from '../../../components/empty-state';
import { PanelHeader } from '../../../components/panel-header';
import { shortUserId } from '../../../collaboration';
import { formatCalendarDate, useI18n } from '../../../i18n';
import { SideDrawer } from './side-drawer';

export type TaskPlanView = 'list' | 'board';

const Panel = styled.aside`
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: ${({ theme }) => theme.canvas.surface};
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

  .task-plan-view-panel {
    padding-top: 0;
  }
`;

const ViewTabs = styled.div`
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[4]} 0`};
`;

const Groups = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[5]};
`;

const Board = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: start;
  gap: ${({ theme }) => theme.space[3]};

  @media (max-width: 1280px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 700px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const BoardColumnHeading = styled(Heading)`
  font-size: ${({ theme }) => theme.font.size.base};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  line-height: ${({ theme }) => theme.font.leading.tight};
  overflow-wrap: break-word;
`;

const BoardColumn = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
  min-width: 0;
  padding: ${({ theme }) => theme.space[2]};
  border: 1px solid ${({ theme }) => theme.canvas.elementBorderSoft};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.canvas.surfaceMuted};
`;

const BoardCard = styled.li`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[1]};
  min-width: 0;
  border: 1px solid ${({ theme }) => theme.color.border.default};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.background.surface};
`;

const BoardMeta = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const BoardMetaItem = styled(Text)`
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const BoardEmpty = styled(Text)`
  display: block;
  padding: ${({ theme }) => `${theme.space[3]} ${theme.space[2]}`};
  border: 1px dashed ${({ theme }) => theme.canvas.elementBorderSoft};
  border-radius: ${({ theme }) => theme.radius.md};
  text-align: center;
`;

const BoardMenuTrigger = styled(DropdownMenu.Trigger)`
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin: ${({ theme }) => `${theme.space[2]} ${theme.space[1]} 0 0`};
  padding: 0;
  border: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: none;
  color: ${({ theme }) => theme.color.text.muted};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.color.background.sunken};
    color: ${({ theme }) => theme.color.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focusRing};
    outline-offset: 2px;
  }
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

const BoardCardMain = styled(TaskButton)`
  flex: 1 1 auto;
  min-width: 0;
  gap: ${({ theme }) => theme.space[2]};
  padding: ${({ theme }) => theme.space[3]};
`;

const BoardCardTitle = styled(TaskTitle)`
  display: -webkit-box;
  overflow: hidden;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
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
  readonly assignees?: readonly TaskAssigneeOption[];
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
  assignees = [],
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

  const [view, setView] = useState<TaskPlanView>('list');

  const groups = useMemo(
    () => selectTaskPlan(elements, { status: statusFilter, onlyMine, currentUserId }),
    [currentUserId, elements, onlyMine, statusFilter],
  );
  const boardGroups = useMemo(
    () => selectTaskPlanBoard(elements, { status: statusFilter, onlyMine, currentUserId }),
    [currentUserId, elements, onlyMine, statusFilter],
  );
  const hasAnyTask = useMemo(() => elements.some(isTaskElement), [elements]);
  const assigneeLabels = useMemo(
    () => new Map(assignees.map((assignee) => [assignee.userId, assignee.label])),
    [assignees],
  );

  if (!open) {
    return null;
  }

  const clearFilters = (): void => {
    setStatusFilter('all');
    setOnlyMine(false);
  };

  const describeTask = (
    task: TaskElement,
  ): { title: string; assignee: string; dueDate: string; overdue: boolean } => {
    const title = richTextToPlain(task.title);
    const assignee =
      task.assigneeId === undefined
        ? t('plan.unassigned')
        : t('plan.assignee', {
            name: assigneeLabels.get(task.assigneeId.value) ?? shortUserId(task.assigneeId.value),
          });
    const overdue =
      task.status !== 'completed' && task.dueDate !== undefined && isTaskOverdue(task.dueDate);
    const dueDate =
      task.dueDate === undefined
        ? t('plan.noDueDate')
        : overdue
          ? `${t('task.overdue')} · ${formatCalendarDate(task.dueDate, locale)}`
          : t('plan.due', { date: formatCalendarDate(task.dueDate, locale) });

    return { title, assignee, dueDate, overdue };
  };

  const renderTask = (task: TaskElement): ReactNode => {
    const { title, assignee, dueDate, overdue } = describeTask(task);

    return (
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
            <Text
              color={overdue ? 'color.text.danger' : 'color.text.muted'}
              size="font.size.xs"
              data-task-overdue={overdue ? 'true' : undefined}
            >
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
              <Select.Trigger size="sm" aria-label={t('plan.changeStatus', { title })}>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {TASK_STATUSES.map((status) => (
                  <Select.Item key={status} value={status}>
                    {t(TASK_STATUS_LABEL_KEYS[status])}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          ) : (
            <Badge variant={TASK_STATUS_META[task.status].variant}>
              {t(TASK_STATUS_LABEL_KEYS[task.status])}
            </Badge>
          )}
        </StatusControl>
      </TaskRow>
    );
  };

  const renderBoardCard = (task: TaskElement): ReactNode => {
    const { title, assignee, dueDate, overdue } = describeTask(task);

    return (
      <BoardCard>
        <BoardCardMain
          type="button"
          title={title}
          aria-label={t('plan.selectTask', { title })}
          onClick={() => onSelectTask(task.id.value)}
        >
          <BoardCardTitle>{title}</BoardCardTitle>
          <BoardMeta>
            <BoardMetaItem color="color.text.muted" size="font.size.xs" title={assignee}>
              {assignee}
            </BoardMetaItem>
            <BoardMetaItem
              color={overdue ? 'color.text.danger' : 'color.text.muted'}
              size="font.size.xs"
              data-task-overdue={overdue ? 'true' : undefined}
            >
              {dueDate}
            </BoardMetaItem>
          </BoardMeta>
        </BoardCardMain>
        {canEdit ? (
          <DropdownMenu>
            <BoardMenuTrigger aria-label={t('plan.changeStatus', { title })}>
              <Ellipsis aria-hidden="true" size={16} />
            </BoardMenuTrigger>
            <DropdownMenu.Content placement="bottom-end">
              {TASK_STATUSES.map((status) => (
                <DropdownMenu.Item
                  key={status}
                  startIcon={
                    status === task.status ? <Check aria-hidden="true" size={16} /> : undefined
                  }
                  onSelect={() => {
                    if (status !== task.status) {
                      onChangeStatus(task, status);
                    }
                  }}
                >
                  {t(TASK_STATUS_LABEL_KEYS[status])}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu>
        ) : null}
      </BoardCard>
    );
  };

  return (
    <SideDrawer
      open
      onClose={onClose}
      label={t('plan.title')}
      size={view === 'board' ? 'board' : 'default'}
    >
      <Panel id="task-plan-panel" aria-label={t('plan.title')} data-testid="task-plan-panel">
        <PanelHeader
          icon={<ClipboardList aria-hidden="true" size={18} />}
          title={t('plan.title')}
          onClose={onClose}
          closeLabel={t('plan.close')}
        />
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
                  {t(TASK_STATUS_LABEL_KEYS[status])}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
          <MineFilter>
            <Checkbox checked={onlyMine} onChange={(event) => setOnlyMine(event.target.checked)} />
            <Text size="font.size.sm">{t('plan.filter.mine')}</Text>
          </MineFilter>
        </Filters>
        <Tabs
          value={view}
          onValueChange={(value) => setView(value as TaskPlanView)}
          classNames={{ panel: 'task-plan-view-panel' }}
        >
          <ViewTabs>
            <Tabs.List aria-label={t('plan.view.label')}>
              <Tabs.Trigger value="list">{t('plan.view.list')}</Tabs.Trigger>
              <Tabs.Trigger value="board">{t('plan.view.board')}</Tabs.Trigger>
            </Tabs.List>
          </ViewTabs>
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
              <>
                <Tabs.Panel value="list">
                  {view === 'list' ? (
                    <Groups>
                      {groups.map((group) => (
                        <section
                          key={group.status}
                          aria-labelledby={`task-plan-group-${group.status}`}
                        >
                          <GroupHeader>
                            <Heading as="h3" id={`task-plan-group-${group.status}`}>
                              {t(TASK_STATUS_LABEL_KEYS[group.status])}
                            </Heading>
                            <Badge variant="neutral">{group.tasks.length}</Badge>
                          </GroupHeader>
                          <TaskList>
                            {group.tasks.map((task) => (
                              <li key={task.id.value}>{renderTask(task)}</li>
                            ))}
                          </TaskList>
                        </section>
                      ))}
                    </Groups>
                  ) : null}
                </Tabs.Panel>
                <Tabs.Panel value="board">
                  {view === 'board' ? (
                    <Board role="group" aria-label={t('plan.board.label')}>
                      {boardGroups.map((group) => (
                        <BoardColumn
                          key={group.status}
                          aria-labelledby={`task-plan-board-group-${group.status}`}
                        >
                          <GroupHeader>
                            <BoardColumnHeading
                              as="h3"
                              id={`task-plan-board-group-${group.status}`}
                            >
                              {t(TASK_STATUS_LABEL_KEYS[group.status])}
                            </BoardColumnHeading>
                            <Badge variant={TASK_STATUS_META[group.status].variant}>
                              {group.tasks.length}
                            </Badge>
                          </GroupHeader>
                          {group.tasks.length === 0 ? (
                            <BoardEmpty color="color.text.muted" size="font.size.xs">
                              {t('plan.board.empty')}
                            </BoardEmpty>
                          ) : (
                            <TaskList>
                              {group.tasks.map((task) => (
                                <Fragment key={task.id.value}>{renderBoardCard(task)}</Fragment>
                              ))}
                            </TaskList>
                          )}
                        </BoardColumn>
                      ))}
                    </Board>
                  ) : null}
                </Tabs.Panel>
              </>
            )}
          </Body>
        </Tabs>
      </Panel>
    </SideDrawer>
  );
}
