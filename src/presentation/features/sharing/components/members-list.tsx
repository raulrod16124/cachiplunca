import {
  Avatar,
  Badge,
  Button,
  Inline,
  Select,
  Skeleton,
  Stack,
  Text,
  VisuallyHidden,
} from '@raulrod/ui';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import type { Membership, MembershipRole } from '../../../../domain/membership';

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

const ROLE_LABELS: Record<MembershipRole, string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
};

const ROLE_OPTIONS: readonly MembershipRole[] = ['owner', 'editor', 'viewer'];

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]};
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
  if (status === 'loading') {
    return (
      <Stack gap="space-2" role="status" aria-busy="true">
        <VisuallyHidden>Loading members</VisuallyHidden>
        <Skeleton style={{ height: '40px', width: '70%' }} />
        <Skeleton style={{ height: '40px', width: '60%' }} />
      </Stack>
    );
  }

  if (status === 'error') {
    return (
      <Stack gap="space-3" role="alert" aria-live="polite">
        <Text color="color.text.danger">{errorMessage ?? 'Something went wrong.'}</Text>
        <Inline>
          <Button type="button" variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        </Inline>
      </Stack>
    );
  }

  if (members.length === 0) {
    return <Text color="color.text.muted">No members yet.</Text>;
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
            <li key={userId}>
              <Inline justify="between" align="center" gap="space-3" wrap>
                <Inline gap="space-2" align="center">
                  <Avatar name={label} size="sm" />
                  <Text>{label}</Text>
                  {isSelf ? <Badge variant="info">You</Badge> : null}
                </Inline>
                <Inline gap="space-2" align="center">
                  {isSelf || !canChangeRole ? (
                    <Badge variant="neutral">{ROLE_LABELS[member.role]}</Badge>
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
                            {ROLE_LABELS[role]}
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
                          Leave workspace
                        </Button>
                      )
                    : canRemove && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          loading={isPending}
                          onClick={() => onRemove(userId)}
                        >
                          Remove
                        </Button>
                      )}
                </Inline>
              </Inline>
            </li>
          );
        })}
      </List>
    </Stack>
  );
}
