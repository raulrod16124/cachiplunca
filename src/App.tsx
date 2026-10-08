import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { createAuthServices } from './app/config/auth-services';
import { createWorkspaceServices } from './app/config/workspace-services';
import { AppRoutes } from './app/routes/app-routes';
import { SessionProvider } from './app/providers/session-provider';

function App() {
  const [authServices] = useState(createAuthServices);
  const [workspaceServices] = useState(createWorkspaceServices);

  return (
    <BrowserRouter>
      <SessionProvider store={authServices.sessionStore}>
        <AppRoutes
          registerUser={authServices.registerUser}
          loginUser={authServices.loginUser}
          logoutUser={authServices.logoutUser}
          listWorkspaces={workspaceServices.listWorkspaces}
        />
      </SessionProvider>
    </BrowserRouter>
  );
}

export default App;
