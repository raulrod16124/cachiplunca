import { Avatar, Badge, Button, Inline, Select, Skeleton, Stack, Text } from '@raulrod/ui';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import type { Membership, MembershipRole } from '../../../../domain/membership';
import { ActionRow } from '../../../components/action-row';
import { Card } from '../../../components/card';
import { EmptyState } from '../../../components/empty-state';
import { ErrorState } from '../../../components/error-state';
import { LoadingState } from '../../../components/loading-state';
import { useI18n, type TranslationKey } from '../../../i18n';

export type MembersStatus = 'loading' | 'error' | 'ready';

export interface MembersListProps {
  readonly status: MembersStatus;
  readonly members: readonly Membership[];
  readonly currentUserId: string;
  readonly errorMessage: string | null;
  readonly actionError: string | null;
  readonly pendingUserId: string | null;
  readonly canChangeRole: boolean;
  readonly canRemove: boolean;
  readonly canLeave: boolean;
  readonly onChangeRole: (userId: string, role: MembershipRole) => void;
  readonly onRemove: (userId: string) => void;
  readonly onLeave: () => void;
  readonly onRetry: () => void;
}

const MEMBER_LABEL_LENGTH = 8;

const ROLE_KEYS: Record<MembershipRole, TranslationKey> = {
  owner: 'share.role.owner',
  editor: 'share.role.editor',
  viewer: 'share.role.viewer',
};

const ROLE_OPTIONS: readonly MembershipRole[] = ['owner', 'editor', 'viewer'];

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
`;

const MemberIdentity = styled(Inline)`
  min-width: 0;
`;

export function memberLabel(userId: string): string {
  return userId.length <= MEMBER_LABEL_LENGTH ? userId : userId.slice(-MEMBER_LABEL_LENGTH);
}

export function MembersList({
  status,
  members,
  currentUserId,
  errorMessage,
  actionError,
  pendingUserId,
  canChangeRole,
  canRemove,
  canLeave,
  onChangeRole,
  onRemove,
  onLeave,
  onRetry,
}: MembersListProps): ReactNode {
  const { t } = useI18n();

  if (status === 'loading') {
    return (
      <LoadingState label="Loading members">
        <Stack gap="space-2">
          <Skeleton style={{ height: '56px', width: '100%' }} />
          <Skeleton style={{ height: '56px', width: '100%' }} />
        </Stack>
      </LoadingState>
    );
  }

  if (status === 'error') {
    return (
      <ErrorState
        title="Could not load members"
        description={errorMessage ?? 'Something went wrong.'}
        actionLabel={t('common.retry')}
        onAction={onRetry}
      />
    );
  }

  if (members.length === 0) {
    return <EmptyState title={t('share.membersEmpty')} titleAs="h3" />;
  }

  return (
    <Stack gap="space-3">
      {actionError === null ? null : (
        <Text role="alert" color="color.text.danger">
          {actionError}
        </Text>
      )}
      <List>
        {members.map((member) => {
          const userId = member.userId.value;
          const label = memberLabel(userId);
          const isSelf = userId === currentUserId;
          const isPending = pendingUserId === userId;

          return (
            <Card key={userId} as="li" padding="sm" data-testid="member-row">
              <ActionRow
                wrap
                leading={<Avatar name={label} size="sm" />}
                trailing={
                  <Inline gap="space-2" align="center" wrap>
                    {isSelf || !canChangeRole ? (
                      <Badge variant="neutral">{t(ROLE_KEYS[member.role])}</Badge>
                    ) : (
                      <Select
                        value={member.role}
                        onValueChange={(value) => onChangeRole(userId, value as MembershipRole)}
                      >
                        <Select.Trigger aria-label={`Role for ${label}`} disabled={isPending}>
                          <Select.Value />
                        </Select.Trigger>
                        <Select.Content>
                          {ROLE_OPTIONS.map((role) => (
                            <Select.Item key={role} value={role}>
                              {t(ROLE_KEYS[role])}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select>
                    )}
                    {isSelf
                      ? canLeave && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            loading={isPending}
                            onClick={onLeave}
                          >
                            {t('share.leave')}
                          </Button>
                        )
                      : canRemove && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            loading={isPending}
                            onClick={() => onRemove(userId)}
                          >
                            {t('share.remove')}
                          </Button>
                        )}
                  </Inline>
                }
              >
                <MemberIdentity gap="space-2" align="center" wrap>
                  <Text weight="font.weight.medium">{label}</Text>
                  {isSelf ? <Badge variant="info">{t('share.you')}</Badge> : null}
                </MemberIdentity>
              </ActionRow>
            </Card>
          );
        })}
      </List>
    </Stack>
  );
}
