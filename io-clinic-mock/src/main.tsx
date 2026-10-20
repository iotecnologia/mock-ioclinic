import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './estilos/clinica.css';
import './estilos/telas.css';
import './estilos/impressao.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
