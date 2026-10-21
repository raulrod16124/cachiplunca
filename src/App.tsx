import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { createAuthServices, type AuthServices } from './app/config/auth-services';
import { createCommentServices } from './app/config/comment-services';
import { createElementServices, type ElementServices } from './app/config/element-services';
import { createExportServices, type ExportServices } from './app/config/export-services';
import { createImageServices } from './app/config/image-services';
import { createGuestLinkServices, type GuestLinkServices } from './app/config/guest-link-services';
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
import type { CommentServices } from './application/comment-services';
import type { ImageServices } from './application/image-services';
import { AppRoutes } from './app/routes/app-routes';
import { UserId } from './domain/shared/value-objects/user-id';
import { getFirebaseFirestore } from './infrastructure/firebase/firebase-app';
import { ProfileServicesProvider } from './presentation/features/profile/profile-services-provider';
import { I18nProvider } from './presentation/i18n';
import { SkipLink } from './presentation/components/skip-link';
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
  readonly exportServices: ExportServices;
  readonly commentServices: CommentServices;
  readonly imageServices: ImageServices;
  readonly guestLinkServices: GuestLinkServices;
}

function AppContent({
  authServices,
  workspaceServices,
  elementServices,
  presenceServices,
  invitationServices,
  userSettingsServices,
  exportServices,
  commentServices,
  imageServices,
  guestLinkServices,
}: AppContentProps) {
  const session = useSession();
  const userId = session.status === 'authenticated' ? UserId.create(session.user.uid) : null;

  return (
    <UserSettingsProvider store={userSettingsServices.userSettingsStore} userId={userId}>
      <I18nProvider>
        <SkipLink />
        <ProfileServicesProvider
          services={{
            updateUserProfile: authServices.updateUserProfile,
            changeUserEmail: authServices.changeUserEmail,
            changeUserPassword: authServices.changeUserPassword,
          }}
        >
          <AppRoutes
            registerUser={authServices.registerUser}
            loginUser={authServices.loginUser}
            logoutUser={authServices.logoutUser}
            sendEmailVerification={authServices.sendEmailVerification}
            refreshUser={authServices.refreshUser}
            listWorkspaces={workspaceServices.listWorkspaces}
            createWorkspaceWithOwner={workspaceServices.createWorkspaceWithOwner}
            duplicateWorkspace={workspaceServices.duplicateWorkspace}
            deleteWorkspace={workspaceServices.deleteWorkspace}
            getWorkspace={workspaceServices.getWorkspace}
            getWorkspaceRole={workspaceServices.getWorkspaceRole}
            loadWorkspaceElements={elementServices.loadWorkspaceElements}
            elementPersistenceOrchestrator={elementServices.elementPersistenceOrchestrator}
            realtimeSubscriptionManager={elementServices.realtimeSubscriptionManager}
            generateElementId={elementServices.generateElementId}
            presencePort={presenceServices.presencePort}
            inviteMember={invitationServices.inviteMember}
            listPendingInvitations={invitationServices.listPendingInvitations}
            listPendingInvitationsForUser={invitationServices.listPendingInvitationsForUser}
            watchPendingInvitationsForUser={invitationServices.watchPendingInvitationsForUser}
            acceptInvitation={invitationServices.acceptInvitation}
            acceptInvitationById={invitationServices.acceptInvitationById}
            listWorkspaceMembers={workspaceServices.listWorkspaceMembers}
            changeMemberRole={workspaceServices.changeMemberRole}
            removeMember={workspaceServices.removeMember}
            leaveWorkspace={workspaceServices.leaveWorkspace}
            updateWorkspace={workspaceServices.updateWorkspace}
            fileDownload={exportServices.fileDownload}
            comments={commentServices}
            imageServices={imageServices}
            guestLinks={guestLinkServices}
          />
        </ProfileServicesProvider>
      </I18nProvider>
    </UserSettingsProvider>
  );
}

function App() {
  const [authServices] = useState(createAuthServices);
  const [elementServices] = useState(createElementServices);
  const [workspaceServices] = useState(() =>
    createWorkspaceServices({ generateElementId: elementServices.generateElementId }),
  );
  const [presenceServices] = useState(createPresenceServices);
  const [invitationServices] = useState(createInvitationServices);
  const [userSettingsServices] = useState(() => createUserSettingsServices(getFirebaseFirestore()));
  const [exportServices] = useState(createExportServices);
  const [commentServices] = useState(createCommentServices);
  const [imageServices] = useState(createImageServices);
  const [guestLinkServices] = useState(() =>
    createGuestLinkServices({ signInAnonymously: authServices.signInAnonymously }),
  );

  const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;

  return (
    <AppThemeProvider>
      <BrowserRouter basename={routerBasename}>
        <SessionProvider store={authServices.sessionStore}>
          <AppContent
            authServices={authServices}
            workspaceServices={workspaceServices}
            elementServices={elementServices}
            presenceServices={presenceServices}
            invitationServices={invitationServices}
            userSettingsServices={userSettingsServices}
            exportServices={exportServices}
            commentServices={commentServices}
            imageServices={imageServices}
            guestLinkServices={guestLinkServices}
          />
        </SessionProvider>
      </BrowserRouter>
    </AppThemeProvider>
  );
}

export default App;
