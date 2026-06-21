import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ADMIN_LINKS = [
  { to: '/admin/statistik', label: 'Statistik & Beranda' },
  { to: '/admin/kuota', label: 'Atur Kuota' },
  { to: '/admin/verifikasi', label: 'Verifikasi Data Warga' },
  { to: '/admin/status', label: 'Status Penerima Bantuan' },
  { to: '/admin/riwayat', label: 'Riwayat Hasil Seleksi' },
];

const WARGA_LINKS = [
  { to: '/warga/data', label: 'Data Administratif' },
  { to: '/warga/foto', label: 'Foto Kondisi Rumah' },
  { to: '/warga/status', label: 'Status Bantuan' },
  { to: '/warga/profil', label: 'Profil Saya' },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const links = user?.role === 'admin' ? ADMIN_LINKS : WARGA_LINKS;
  return (
    <aside className="sidebar">
      <strong>SIBANSOS RT</strong>
      <nav>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'active' : '')}>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <button className="btn btn-ghost" style={{ marginTop: 24 }} onClick={logout}>Keluar</button>
    </aside>
  );
}
