import { Heading, IconButton, Input, Tooltip } from '@raulrod/ui';
import { Pencil } from '@raulrod/icons';
import { useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import styled from 'styled-components';
import type { UpdateWorkspaceResult } from '../../../../application/commands';
import { FieldError } from '../../../components';
import { localizeFieldError, useI18n } from '../../../i18n';

const TitleGroup = styled.span`
  display: inline-flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[1]};
  min-width: 0;
  max-width: min(36vw, 420px);
`;

const TruncatedHeading = styled(Heading)`
  && {
    display: -webkit-box;
    overflow: hidden;
    overflow-wrap: anywhere;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    min-width: 0;
    font-size: ${({ theme }) => theme.font.size.lg};
    line-height: ${({ theme }) => theme.font.leading.tight};
  }
`;

const EditAffordance = styled(IconButton)`
  flex: none;
  opacity: 0;
  transition: opacity ${({ theme }) => theme.motion.duration.fast} ease;

  ${TitleGroup}:hover &,
  ${TitleGroup}:focus-within & {
    opacity: 1;
  }

  @media (hover: none) {
    opacity: 1;
  }
`;

const TitleInput = styled(Input)`
  min-width: 12ch;
  max-width: 100%;
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  font-size: ${({ theme }) => theme.font.size.lg};
`;

const TitleColumn = styled.span`
  display: inline-flex;
  flex-direction: column;
  min-width: 0;
`;

export interface WorkspaceTitleFieldProps {
  readonly name: string;
  readonly onRename?: (name: string) => Promise<UpdateWorkspaceResult>;
}

export function WorkspaceTitleField({ name, onRename }: WorkspaceTitleFieldProps): ReactNode {
  const { t } = useI18n();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cancelledRef = useRef(false);

  const editing = draft !== null;

  if (onRename === undefined) {
    return (
      <TitleGroup>
        <TruncatedHeading as="h1">{name}</TruncatedHeading>
      </TitleGroup>
    );
  }

  const rename = onRename;

  function beginEdit(): void {
    cancelledRef.current = false;
    setError(null);
    setDraft(name);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }

  function cancelEdit(): void {
    cancelledRef.current = true;
    setDraft(null);
    setError(null);
  }

  async function commitEdit(): Promise<void> {
    if (cancelledRef.current) {
      cancelledRef.current = false;
      return;
    }
    if (draft === null || pending) {
      return;
    }
    if (draft.trim() === name.trim()) {
      cancelEdit();
      return;
    }

    setPending(true);
    const result = await rename(draft);
    setPending(false);

    if (result.status === 'ok') {
      cancelEdit();
      return;
    }
    if (result.status === 'invalid-input') {
      setError(localizeFieldError(t, result.fieldErrors.name ?? 'Enter a workspace name.'));
      inputRef.current?.focus();
      return;
    }
    setError(t('errors.renameWorkspace'));
    inputRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      void commitEdit();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelEdit();
    }
  }

  return (
    <TitleColumn>
      <TitleGroup>
        {editing ? (
          <TitleInput
            ref={inputRef}
            aria-label="Workspace name"
            value={draft}
            maxLength={100}
            disabled={pending}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => void commitEdit()}
          />
        ) : (
          <>
            <TruncatedHeading as="h1">{name}</TruncatedHeading>
            <Tooltip content={t('canvas.topbar.rename')} placement="bottom">
              <EditAffordance
                type="button"
                variant="ghost"
                size="sm"
                label={t('canvas.topbar.rename')}
                onClick={beginEdit}
              >
                <Pencil aria-hidden="true" size={14} />
              </EditAffordance>
            </Tooltip>
          </>
        )}
      </TitleGroup>
      <FieldError message={error ?? undefined} />
    </TitleColumn>
  );
}
