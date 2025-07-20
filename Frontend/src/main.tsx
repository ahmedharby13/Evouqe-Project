import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import ShopContextProvider from './context/shopContext';
import { CookiesProvider } from 'react-cookie';

const root = createRoot(document.getElementById('root')!);
root.render(
  <BrowserRouter>
  <CookiesProvider >    <ShopContextProvider>
      <App />
    </ShopContextProvider>
</CookiesProvider>

  </BrowserRouter>
);