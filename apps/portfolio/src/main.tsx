import { createRoot } from 'react-dom/client';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import App from './App.tsx';
import './site.css';

createRoot(document.getElementById('root')!).render(<App />);
