import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import ShareWarningPage from './pages/ShareWarningPage';
import ExamplePage from './pages/ExamplePage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/examples/:slug" element={<ExamplePage />} />
        <Route path="/share/:encoded" element={<ShareWarningPage />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
);
