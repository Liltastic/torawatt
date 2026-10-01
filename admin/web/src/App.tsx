import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { ToastProvider } from './components/Toast';
import { SessionProvider, useSession } from './lib/session';
import { Shell } from './layout/Shell';
import { Analytics } from './pages/Analytics';
import { Campaigns } from './pages/Campaigns';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Reservations } from './pages/Reservations';
import { Sessions } from './pages/Sessions';
import { Stations } from './pages/Stations';
import { Support } from './pages/Support';
import { Users } from './pages/Users';
import { Vehicles } from './pages/Vehicles';

function Gate() {
  const { status } = useSession();

  // Oturum kontrolu bitmeden yonlendirme yapilmiyor: aksi halde cerezi gecerli
  // olan kullanici her acilista bir an giris ekranini goruyor.
  if (status === 'checking') return <div className="app" />;
  if (status === 'out') return <Login />;

  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Dashboard />} />
        <Route path="analiz" element={<Analytics />} />
        <Route path="istasyonlar" element={<Stations />} />
        <Route path="kullanicilar" element={<Users />} />
        <Route path="rezervasyonlar" element={<Reservations />} />
        <Route path="oturumlar" element={<Sessions />} />
        <Route path="araclar" element={<Vehicles />} />
        <Route path="kampanyalar" element={<Campaigns />} />
        <Route path="destek" element={<Support />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <SessionProvider>
      <ToastProvider>
        <BrowserRouter>
          <Gate />
        </BrowserRouter>
      </ToastProvider>
    </SessionProvider>
  );
}
