import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Login from './components/Login';
import HUD from './components/HUD';

const Main = () => {
  const { user } = useApp();
  return user ? <HUD /> : <Login />;
};

function App() {
  return (
    <AppProvider>
      <Main />
    </AppProvider>
  );
}

export default App;
