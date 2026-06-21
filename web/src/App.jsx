import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
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

function Protected({ role, children }) {
  const { user } = useAuth();
  if (user === undefined) return <p>Memuat...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return (
    <div className="app">
      <Sidebar />
      <main className="main">{children}</main>
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
          user === undefined ? <p>Memuat...</p> :
          user?.role === 'admin' ? <Navigate to="/admin/statistik" replace /> :
          user?.role === 'warga' ? <Navigate to="/warga/data" replace /> :
          <Navigate to="/login" replace />
        }
      />
    </Routes>
  );
}
