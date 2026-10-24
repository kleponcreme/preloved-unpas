import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider } from './components/Toast';
import { AuthProvider } from './services/auth';
import { firebaseSiap } from './services/firebase';
import './styles/global.css';

const Root = firebaseSiap ? AuthProvider : React.Fragment;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <Root>
          <App />
        </Root>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
