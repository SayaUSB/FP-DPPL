import { useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Icon } from './components/ui';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { DataAdministratif } from './pages/warga/DataAdministratif';
import { FotoRumah } from './pages/warga/FotoRumah';
import { StatusBantuanWarga } from './pages/warga/StatusBantuanWarga';
import { ProfilWarga } from './pages/warga/ProfilWarga';
import { Kuota } from './pages/admin/Kuota';
import { Verifikasi } from './pages/admin/Verifikasi';
import { StatusSeleksi } from './pages/admin/StatusSeleksi';
import { Riwayat } from './pages/admin/Riwayat';
import { Statistik } from './pages/admin/Statistik';
import { UbahWarga } from './pages/admin/UbahWarga';

const TITLES = {
  '/admin/statistik': { crumb: 'Dashboard', title: 'Statistik & Beranda' },
  '/admin/kuota': { crumb: 'Pengaturan', title: 'Atur Kuota Penerima Bantuan' },
  '/admin/verifikasi': { crumb: 'Pengelolaan Data', title: 'Verifikasi Validitas Data Warga' },
  '/admin/status': { crumb: 'Seleksi', title: 'Status Penerima Bantuan' },
  '/admin/riwayat': { crumb: 'Evaluasi', title: 'Riwayat Hasil Seleksi' },
  '/warga/data': { crumb: 'Data Saya', title: 'Data Administratif' },
  '/warga/foto': { crumb: 'Data Saya', title: 'Foto Kondisi Rumah' },
  '/warga/status': { crumb: 'Bantuan', title: 'Status Penerimaan Bantuan' },
  '/warga/profil': { crumb: 'Data Saya', title: 'Profil Saya' },
};

function pageTitle(pathname) {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith('/admin/warga/')) return { crumb: 'Pengelolaan Data', title: 'Ubah Data Warga' };
  return { crumb: '', title: 'SIBANSOS RT' };
}

function Protected({ role, children }) {
  const { user } = useAuth();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  if (user === undefined) return <p style={{ padding: 24 }}>Memuat...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;

  const { crumb, title } = pageTitle(location.pathname);

  return (
    <div className="app">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} />}
      <div className="main">
        <header className="topbar">
          <button className="iconbtn menu-btn" onClick={() => setNavOpen(true)}><Icon name="menu" /></button>
          <div>
            <div className="crumb">{crumb}</div>
            <h1>{title}</h1>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/daftar" element={<Register />} />

      <Route path="/warga/data" element={<Protected role="warga"><DataAdministratif /></Protected>} />
      <Route path="/warga/foto" element={<Protected role="warga"><FotoRumah /></Protected>} />
      <Route path="/warga/status" element={<Protected role="warga"><StatusBantuanWarga /></Protected>} />
      <Route path="/warga/profil" element={<Protected role="warga"><ProfilWarga /></Protected>} />

      <Route path="/admin/kuota" element={<Protected role="admin"><Kuota /></Protected>} />
      <Route path="/admin/verifikasi" element={<Protected role="admin"><Verifikasi /></Protected>} />
      <Route path="/admin/warga/:id/ubah" element={<Protected role="admin"><UbahWarga /></Protected>} />
      <Route path="/admin/status" element={<Protected role="admin"><StatusSeleksi /></Protected>} />
      <Route path="/admin/riwayat" element={<Protected role="admin"><Riwayat /></Protected>} />
      <Route path="/admin/statistik" element={<Protected role="admin"><Statistik /></Protected>} />

      <Route
        path="/"
        element={
          user === undefined ? <p style={{ padding: 24 }}>Memuat...</p> :
          user?.role === 'admin' ? <Navigate to="/admin/statistik" replace /> :
          user?.role === 'warga' ? <Navigate to="/warga/data" replace /> :
          <Navigate to="/login" replace />
        }
      />
    </Routes>
  );
}
