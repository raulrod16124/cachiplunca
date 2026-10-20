import { IconButton, Input, type InputProps } from '@raulrod/ui';
import { Eye, EyeOff } from '@raulrod/icons';
import { useState, type ReactElement } from 'react';
import styled from 'styled-components';
import { useI18n } from '../../i18n';

const Wrapper = styled.span`
  position: relative;
  display: block;

  & > input {
    width: 100%;
    padding-right: ${({ theme }) => theme.space[10]};
  }
`;

const Toggle = styled(IconButton)`
  position: absolute;
  top: 50%;
  right: ${({ theme }) => theme.space[1]};
  transform: translateY(-50%);
`;

export type PasswordInputProps = Omit<InputProps, 'type'>;

export function PasswordInput(props: PasswordInputProps): ReactElement {
  const [visible, setVisible] = useState(false);
  const { t } = useI18n();

  return (
    <Wrapper>
      <Input {...props} type={visible ? 'text' : 'password'} />
      <Toggle
        type="button"
        variant="ghost"
        size="sm"
        label={visible ? t('auth.hidePassword') : t('auth.showPassword')}
        aria-pressed={visible}
        aria-controls={props.id}
        onClick={() => setVisible((value) => !value)}
      >
        {visible ? <EyeOff aria-hidden="true" size={16} /> : <Eye aria-hidden="true" size={16} />}
      </Toggle>
    </Wrapper>
  );
}
