import { createContext, useContext, type ReactNode } from 'react';
import type {
  ChangeUserEmail,
  ChangeUserPassword,
  UpdateUserProfile,
} from '../../../application/commands';

export interface ProfileServices {
  readonly updateUserProfile: UpdateUserProfile;
  readonly changeUserEmail: ChangeUserEmail;
  readonly changeUserPassword: ChangeUserPassword;
}

const ProfileServicesContext = createContext<ProfileServices | null>(null);

export interface ProfileServicesProviderProps {
  readonly services: ProfileServices;
  readonly children: ReactNode;
}

export function ProfileServicesProvider({
  services,
  children,
}: ProfileServicesProviderProps): ReactNode {
  return (
    <ProfileServicesContext.Provider value={services}>{children}</ProfileServicesContext.Provider>
  );
}

export function useProfileServices(): ProfileServices | null {
  return useContext(ProfileServicesContext);
}
