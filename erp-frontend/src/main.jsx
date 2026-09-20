import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import SplashScreen from './components/SplashScreen.jsx';

function Root() {
  const [splash, setSplash] = useState(true);
  return splash ? <SplashScreen onDone={() => setSplash(false)} /> : <App />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
