import { Button, Text } from '@raulrod/ui';
import { Image as ImageIcon, Trash2 } from '@raulrod/icons';
import { useId, useRef, type ReactNode } from 'react';
import styled from 'styled-components';
import { IMAGE_ALLOWED_CONTENT_TYPES } from '../../../../application/services/image-upload';
import { workspaceCoverBackground } from '../../../components/workspace-cover';
import { useI18n } from '../../../i18n';

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
`;

const Frame = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.color.border.default};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.color.text.muted};

  ${workspaceCoverBackground}
`;

const Preview = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const Placeholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  padding: ${({ theme }) => theme.space[4]};
  text-align: center;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[2]};
  flex-wrap: wrap;
`;

const Actions = styled.div`
  display: inline-flex;
  gap: ${({ theme }) => theme.space[2]};
  flex-wrap: wrap;
`;

const FileInput = styled.input`
  display: none;
`;

export interface WorkspaceCoverFieldProps {
  readonly previewUrl: string | null;
  readonly fileName?: string | null;
  readonly disabled?: boolean;
  readonly uploading?: boolean;
  readonly error?: string | null;
  readonly onSelect: (file: File) => void;
  readonly onRemove?: () => void;
}

export function WorkspaceCoverField({
  previewUrl,
  fileName,
  disabled = false,
  uploading = false,
  error = null,
  onSelect,
  onRemove,
}: WorkspaceCoverFieldProps): ReactNode {
  const { t } = useI18n();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const hasImage = previewUrl !== null;

  return (
    <Root>
      <Text weight="font.weight.medium">{t('workspaces.cover.label')}</Text>
      <Frame data-testid="workspace-cover-preview">
        {previewUrl === null ? (
          <Placeholder>
            <ImageIcon aria-hidden="true" size={28} />
            <Text color="color.text.muted" size="font.size.sm">
              {t('workspaces.cover.empty')}
            </Text>
          </Placeholder>
        ) : (
          <Preview src={previewUrl} alt={t('workspaces.cover.previewAlt')} />
        )}
      </Frame>
      <Controls>
        <Text color="color.text.muted" size="font.size.sm">
          {fileName ?? t('workspaces.cover.hint')}
        </Text>
        <Actions>
          {hasImage && onRemove !== undefined && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || uploading}
              onClick={onRemove}
            >
              <Trash2 aria-hidden="true" size={14} />
              {t('workspaces.cover.remove')}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={uploading}
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <ImageIcon aria-hidden="true" size={14} />
            {hasImage ? t('workspaces.cover.change') : t('workspaces.cover.choose')}
          </Button>
        </Actions>
      </Controls>
      <FileInput
        ref={inputRef}
        id={inputId}
        type="file"
        accept={IMAGE_ALLOWED_CONTENT_TYPES.join(',')}
        data-testid="workspace-cover-input"
        aria-label={t('workspaces.cover.label')}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';

          if (file !== undefined) {
            onSelect(file);
          }
        }}
      />
      {error === null ? null : (
        <Text role="alert" color="color.text.danger" size="font.size.sm">
          {error}
        </Text>
      )}
    </Root>
  );
}
