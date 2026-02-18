import React from 'react';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import HUD from './components/HUD';

const Main = () => {
  const { currentUser } = useAuth();
  return currentUser ? <HUD /> : <Login />;
};

function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <Main />
      </AuthProvider>
    </AppProvider>
  );
}

export default App;
