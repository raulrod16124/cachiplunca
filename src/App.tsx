import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { createAuthServices, type AuthServices } from './app/config/auth-services';
import { createElementServices, type ElementServices } from './app/config/element-services';
import {
  createInvitationServices,
  type InvitationServices,
} from './app/config/invitation-services';
import { createPresenceServices, type PresenceServices } from './app/config/presence-services';
import {
  createUserSettingsServices,
  type UserSettingsServices,
} from './app/config/user-settings-services';
import { createWorkspaceServices, type WorkspaceServices } from './app/config/workspace-services';
import { AppRoutes } from './app/routes/app-routes';
import { UserId } from './domain/shared/value-objects/user-id';
import { getFirebaseFirestore } from './infrastructure/firebase/firebase-app';
import { SessionProvider, useSession } from './presentation/providers/session-provider';
import { UserSettingsProvider } from './presentation/providers/user-settings-provider';
import { AppThemeProvider } from './presentation/styles';

interface AppContentProps {
  readonly authServices: AuthServices;
  readonly workspaceServices: WorkspaceServices;
  readonly elementServices: ElementServices;
  readonly presenceServices: PresenceServices;
  readonly invitationServices: InvitationServices;
  readonly userSettingsServices: UserSettingsServices;
}

function AppContent({
  authServices,
  workspaceServices,
  elementServices,
  presenceServices,
  invitationServices,
  userSettingsServices,
}: AppContentProps) {
  const session = useSession();
  const userId = session.status === 'authenticated' ? UserId.create(session.user.uid) : null;

  return (
    <UserSettingsProvider store={userSettingsServices.userSettingsStore} userId={userId}>
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
    </UserSettingsProvider>
  );
}

function App() {
  const [authServices] = useState(createAuthServices);
  const [workspaceServices] = useState(createWorkspaceServices);
  const [elementServices] = useState(createElementServices);
  const [presenceServices] = useState(createPresenceServices);
  const [invitationServices] = useState(createInvitationServices);
  const [userSettingsServices] = useState(() => createUserSettingsServices(getFirebaseFirestore()));

  return (
    <AppThemeProvider>
      <BrowserRouter>
        <SessionProvider store={authServices.sessionStore}>
          <AppContent
            authServices={authServices}
            workspaceServices={workspaceServices}
            elementServices={elementServices}
            presenceServices={presenceServices}
            invitationServices={invitationServices}
            userSettingsServices={userSettingsServices}
          />
        </SessionProvider>
      </BrowserRouter>
    </AppThemeProvider>
  );
}

export default App;
