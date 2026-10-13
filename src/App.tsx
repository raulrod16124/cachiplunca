import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { createAuthServices } from './app/config/auth-services';
import { createElementServices } from './app/config/element-services';
import { createPresenceServices } from './app/config/presence-services';
import { createWorkspaceServices } from './app/config/workspace-services';
import { AppRoutes } from './app/routes/app-routes';
import { SessionProvider } from './app/providers/session-provider';

function App() {
  const [authServices] = useState(createAuthServices);
  const [workspaceServices] = useState(createWorkspaceServices);
  const [elementServices] = useState(createElementServices);
  const [presenceServices] = useState(createPresenceServices);

  return (
    <BrowserRouter>
      <SessionProvider store={authServices.sessionStore}>
        <AppRoutes
          registerUser={authServices.registerUser}
          loginUser={authServices.loginUser}
          logoutUser={authServices.logoutUser}
          listWorkspaces={workspaceServices.listWorkspaces}
          createWorkspaceWithOwner={workspaceServices.createWorkspaceWithOwner}
          getWorkspace={workspaceServices.getWorkspace}
          loadWorkspaceElements={elementServices.loadWorkspaceElements}
          elementPersistenceOrchestrator={elementServices.elementPersistenceOrchestrator}
          realtimeSubscriptionManager={elementServices.realtimeSubscriptionManager}
          generateElementId={elementServices.generateElementId}
          presencePort={presenceServices.presencePort}
        />
      </SessionProvider>
    </BrowserRouter>
  );
}

export default App;
