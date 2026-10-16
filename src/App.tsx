import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { createAuthServices } from './app/config/auth-services';
import { createElementServices } from './app/config/element-services';
import { createInvitationServices } from './app/config/invitation-services';
import { createPresenceServices } from './app/config/presence-services';
import { createWorkspaceServices } from './app/config/workspace-services';
import { AppRoutes } from './app/routes/app-routes';
import { SessionProvider } from './presentation/providers/session-provider';
import { AppThemeProvider } from './presentation/styles';

function App() {
  const [authServices] = useState(createAuthServices);
  const [workspaceServices] = useState(createWorkspaceServices);
  const [elementServices] = useState(createElementServices);
  const [presenceServices] = useState(createPresenceServices);
  const [invitationServices] = useState(createInvitationServices);

  return (
    <AppThemeProvider>
      <BrowserRouter>
        <SessionProvider store={authServices.sessionStore}>
          <AppRoutes
            registerUser={authServices.registerUser}
            loginUser={authServices.loginUser}
            logoutUser={authServices.logoutUser}
            listWorkspaces={workspaceServices.listWorkspaces}
            createWorkspaceWithOwner={workspaceServices.createWorkspaceWithOwner}
            getWorkspace={workspaceServices.getWorkspace}
            getWorkspaceRole={workspaceServices.getWorkspaceRole}
            loadWorkspaceElements={elementServices.loadWorkspaceElements}
            elementPersistenceOrchestrator={elementServices.elementPersistenceOrchestrator}
            realtimeSubscriptionManager={elementServices.realtimeSubscriptionManager}
            generateElementId={elementServices.generateElementId}
            presencePort={presenceServices.presencePort}
            inviteMember={invitationServices.inviteMember}
            listPendingInvitations={invitationServices.listPendingInvitations}
            acceptInvitation={invitationServices.acceptInvitation}
            listWorkspaceMembers={workspaceServices.listWorkspaceMembers}
            changeMemberRole={workspaceServices.changeMemberRole}
            removeMember={workspaceServices.removeMember}
            leaveWorkspace={workspaceServices.leaveWorkspace}
            updateWorkspace={workspaceServices.updateWorkspace}
          />
        </SessionProvider>
      </BrowserRouter>
    </AppThemeProvider>
  );
}

export default App;
