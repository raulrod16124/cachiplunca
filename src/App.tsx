import { useState } from 'react';
import styled from 'styled-components';
import { createAuthServices } from './app/config/auth-services';
import { RegisterForm } from './presentation/features/auth/register-form';

const Screen = styled.main`
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

const Panel = styled.section`
  width: 100%;
  max-width: 420px;
`;

function App() {
  const [authServices] = useState(createAuthServices);

  return (
    <Screen>
      <Panel>
        <RegisterForm registerUser={authServices.registerUser} />
      </Panel>
    </Screen>
  );
}

export default App;
