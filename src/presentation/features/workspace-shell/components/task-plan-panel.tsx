import {
  Badge,
  Checkbox,
  DropdownMenu,
  Heading,
  Select,
  Tabs,
  Text,
  VisuallyHidden,
} from '@raulrod/ui';
import { Check, ClipboardList, Ellipsis } from '@raulrod/icons';
import { Fragment, useId, useMemo, useState, type DragEvent, type ReactNode } from 'react';
import styled from 'styled-components';
import type { Element, TaskElement, TaskStatus } from '../../../../domain/element';
import { TASK_STATUSES, isTaskElement, richTextToPlain } from '../../../../domain/element';
import type { TaskPlanStatusFilter, TaskBoardDropPosition } from '../../../../application/services';
import {
  isBoardDropNoop,
  isTaskOverdue,
  nextBoardOrderForStatusChange,
  resolveBoardOrderForDrop,
  selectTaskPlan,
  selectTaskPlanBoard,
} from '../../../../application/services';
import type { TaskAssigneeOption } from '../../../canvas/components/task-form-dialog';
import {
  TASK_STATUS_LABEL_KEYS,
  TASK_STATUS_META,
} from '../../../canvas/renderers/task-status-meta';
import { Card } from '../../../components/card';
import { EmptyState } from '../../../components/empty-state';
import { Panel as SharedPanel } from '../../../components/panel';
import { PanelHeader } from '../../../components/panel-header';
import { shortUserId } from '../../../collaboration';
import { formatCalendarDate, useI18n } from '../../../i18n';
import { SideDrawer } from './side-drawer';

export type TaskPlanView = 'list' | 'board';

const PanelLayout = styled.div`
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  background: ${({ theme }) => theme.canvas.surface};

  & > aside {
    flex: 1 1 auto;
    min-height: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
  }
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
  min-width: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: ${({ theme }) => theme.space[4]};

  .task-plan-view-panel {
    padding-top: 0;
  }
`;

const ViewTabs = styled.div`
  flex: none;
  min-width: 0;
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

  [data-dragging='true'] {
    opacity: 0.55;
    border-style: dashed;
  }

  [data-drop-target='true'] {
    border-color: var(--cach-border-accent);
    box-shadow: ${({ theme }) => theme.shadow.sm};
  }

  [data-drop-before='true'],
  [data-drop-start='true'] {
    box-shadow: inset 0 2px 0 var(--cach-border-accent);
  }

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

const BoardColumnBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
  min-width: 0;
`;

const TaskCardContent = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[2]};
  width: 100%;
  min-width: 0;
`;

const BoardCardContent = styled(TaskCardContent)`
  gap: ${({ theme }) => theme.space[1]};
`;

const StatusAccent = styled.span<{ readonly $status: TaskStatus }>`
  flex: none;
  align-self: stretch;
  width: 3px;
  min-height: ${({ theme }) => theme.space[6]};
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme, $status }) => {
    if ($status === 'in_progress') {
      return theme.color.text.warning;
    }
    if ($status === 'completed') {
      return theme.color.text.success;
    }
    if ($status === 'blocked') {
      return theme.color.text.destructive;
    }
    return theme.color.text.muted;
  }};
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
    background: var(--cach-control-hover);
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
  readonly onChangeStatus: (task: TaskElement, status: TaskStatus, boardOrder: number) => void;
  readonly onCreateTask: () => void;
}

const sameDropTarget = (
  current: { readonly status: TaskStatus; readonly position: TaskBoardDropPosition } | null,
  status: TaskStatus,
  position: TaskBoardDropPosition,
): boolean => {
  if (current === null || current.status !== status) {
    return false;
  }

  if (current.position.kind === 'before' && position.kind === 'before') {
    return current.position.taskId === position.taskId;
  }

  return current.position.kind === position.kind;
};

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
  const boardHintId = useId();
  const [statusFilter, setStatusFilter] = useState<TaskPlanStatusFilter>('all');
  const [onlyMine, setOnlyMine] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    readonly status: TaskStatus;
    readonly position: TaskBoardDropPosition;
  } | null>(null);
  const [announcement, setAnnouncement] = useState('');

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

  const resetDragState = (): void => {
    setDraggingId(null);
    setDropTarget(null);
  };

  const changeStatus = (task: TaskElement, status: TaskStatus): void => {
    onChangeStatus(task, status, nextBoardOrderForStatusChange(elements, status));
    setAnnouncement(
      t('plan.board.moved', {
        title: richTextToPlain(task.title),
        status: t(TASK_STATUS_LABEL_KEYS[status]),
      }),
    );
  };

  const handleDragStart = (event: DragEvent<HTMLElement>, task: TaskElement): void => {
    if (!canEdit) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.setData('text/plain', task.id.value);
    event.dataTransfer.effectAllowed = 'move';
    setDraggingId(task.id.value);
  };

  const handleDragEnd = (): void => {
    resetDragState();
  };

  const handleDragOver = (
    event: DragEvent<HTMLElement>,
    status: TaskStatus,
    position: TaskBoardDropPosition,
  ): void => {
    if (!canEdit) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    setDropTarget((current) =>
      sameDropTarget(current, status, position) ? current : { status, position },
    );
  };

  const handleDrop = (
    event: DragEvent<HTMLElement>,
    status: TaskStatus,
    position: TaskBoardDropPosition,
  ): void => {
    if (!canEdit) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const taskId = event.dataTransfer.getData('text/plain') || draggingId;
    resetDragState();

    if (taskId === null || taskId === '') {
      return;
    }

    const task = elements.find(
      (element): element is TaskElement => isTaskElement(element) && element.id.value === taskId,
    );

    if (task === undefined) {
      return;
    }

    if (position.kind === 'before' && position.taskId === task.id.value) {
      return;
    }

    if (isBoardDropNoop(elements, task.id.value, status, position)) {
      return;
    }

    const boardOrder = resolveBoardOrderForDrop(elements, status, position);

    onChangeStatus(task, status, boardOrder);
    setAnnouncement(
      t(task.status === status ? 'plan.board.reordered' : 'plan.board.moved', {
        title: richTextToPlain(task.title),
        status: t(TASK_STATUS_LABEL_KEYS[status]),
      }),
    );
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
      <Card as="div" padding="sm" data-task-status={task.status}>
        <TaskCardContent>
          <StatusAccent $status={task.status} aria-hidden="true" data-status-accent={task.status} />
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
                    changeStatus(task, value as TaskStatus);
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
        </TaskCardContent>
      </Card>
    );
  };

  const renderBoardCard = (task: TaskElement): ReactNode => {
    const { title, assignee, dueDate, overdue } = describeTask(task);

    return (
      <Card
        as="li"
        padding="none"
        data-task-status={task.status}
        data-dragging={draggingId === task.id.value ? 'true' : undefined}
        data-drop-before={
          draggingId !== task.id.value &&
          dropTarget?.status === task.status &&
          dropTarget.position.kind === 'before' &&
          dropTarget.position.taskId === task.id.value
            ? 'true'
            : undefined
        }
        draggable={canEdit}
        onDragStart={(event) => handleDragStart(event, task)}
        onDragEnd={handleDragEnd}
        onDragOver={(event) =>
          handleDragOver(event, task.status, { kind: 'before', taskId: task.id.value })
        }
        onDrop={(event) =>
          handleDrop(event, task.status, { kind: 'before', taskId: task.id.value })
        }
      >
        <BoardCardContent>
          <StatusAccent $status={task.status} aria-hidden="true" data-status-accent={task.status} />
          <BoardCardMain
            type="button"
            title={title}
            aria-label={t('plan.selectTask', { title })}
            aria-describedby={canEdit ? boardHintId : undefined}
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
                        changeStatus(task, status);
                      }
                    }}
                  >
                    {t(TASK_STATUS_LABEL_KEYS[status])}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu>
          ) : null}
        </BoardCardContent>
      </Card>
    );
  };

  return (
    <SideDrawer
      open
      onClose={onClose}
      label={t('plan.title')}
      size={view === 'board' ? 'board' : 'default'}
    >
      <PanelLayout>
        <SharedPanel
          as="aside"
          padding="none"
          id="task-plan-panel"
          aria-label={t('plan.title')}
          data-testid="task-plan-panel"
        >
          <PanelHeader
            icon={<ClipboardList aria-hidden="true" size={18} />}
            title={t('plan.title')}
            onClose={onClose}
            closeLabel={t('plan.close')}
          />
          <VisuallyHidden role="status" aria-live="polite">
            {announcement}
          </VisuallyHidden>
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
              <Checkbox
                checked={onlyMine}
                onChange={(event) => setOnlyMine(event.target.checked)}
              />
              <Text size="font.size.sm">{t('plan.filter.mine')}</Text>
            </MineFilter>
          </Filters>
          <Tabs
            value={view}
            onValueChange={(value) => setView(value as TaskPlanView)}
            classNames={{
              list: 'task-plan-view-tabs',
              trigger: 'task-plan-view-trigger',
              panel: 'task-plan-view-panel',
            }}
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
                            <Badge variant={TASK_STATUS_META[group.status].variant}>
                              {group.tasks.length}
                            </Badge>
                          </GroupHeader>
                          <TaskList>
                            {group.tasks.map((task) => (
                              <li key={task.id.value}>{renderTask(task)}</li>
                            ))}
                          </TaskList>
                        </section>
                      ))}
                    </Groups>
                  </Tabs.Panel>
                  <Tabs.Panel value="board">
                    <VisuallyHidden id={boardHintId}>{t('plan.board.dragHint')}</VisuallyHidden>
                    <Board role="group" aria-label={t('plan.board.label')}>
                      {boardGroups.map((group) => (
                        <SharedPanel
                          key={group.status}
                          as="section"
                          variant="sunken"
                          padding="sm"
                          aria-labelledby={`task-plan-board-group-${group.status}`}
                          data-drop-target={
                            dropTarget?.status === group.status &&
                            dropTarget.position.kind === 'end'
                              ? 'true'
                              : undefined
                          }
                          onDragOver={(event) =>
                            handleDragOver(event, group.status, { kind: 'end' })
                          }
                          onDrop={(event) => handleDrop(event, group.status, { kind: 'end' })}
                        >
                          <BoardColumnBody>
                            <GroupHeader
                              data-drop-start={
                                dropTarget?.status === group.status &&
                                dropTarget.position.kind === 'start'
                                  ? 'true'
                                  : undefined
                              }
                              onDragOver={(event) =>
                                handleDragOver(event, group.status, { kind: 'start' })
                              }
                              onDrop={(event) => handleDrop(event, group.status, { kind: 'start' })}
                            >
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
                          </BoardColumnBody>
                        </SharedPanel>
                      ))}
                    </Board>
                  </Tabs.Panel>
                </>
              )}
            </Body>
          </Tabs>
        </SharedPanel>
      </PanelLayout>
    </SideDrawer>
  );
}
