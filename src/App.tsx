import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { createAuthServices } from './app/config/auth-services';
import { AppRoutes } from './app/routes/app-routes';
import { SessionProvider } from './app/providers/session-provider';

function App() {
  const [authServices] = useState(createAuthServices);

  return (
    <BrowserRouter>
      <SessionProvider store={authServices.sessionStore}>
        <AppRoutes
          registerUser={authServices.registerUser}
          loginUser={authServices.loginUser}
          logoutUser={authServices.logoutUser}
        />
      </SessionProvider>
    </BrowserRouter>
  );
}

export default App;
