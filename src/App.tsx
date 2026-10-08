import { useState } from 'react';
import styled from 'styled-components';
import { createAuthServices } from './app/config/auth-services';
import { SessionProvider } from './app/providers/session-provider';
import { AuthFlow } from './presentation/features/auth/auth-flow';

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
        <SessionProvider store={authServices.sessionStore}>
          <AuthFlow
            registerUser={authServices.registerUser}
            loginUser={authServices.loginUser}
            logoutUser={authServices.logoutUser}
          />
        </SessionProvider>
      </Panel>
    </Screen>
  );
}

export default App;
