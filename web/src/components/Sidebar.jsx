import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon } from './ui';

const ADMIN_LINKS = [
  { to: '/admin/statistik', label: 'Statistik & Beranda', icon: 'chart', uc: 'UC03' },
  { to: '/admin/kuota', label: 'Atur Kuota', icon: 'coins', uc: 'UC01' },
  { to: '/admin/verifikasi', label: 'Verifikasi Data Warga', icon: 'verify', uc: 'UC02' },
  { to: '/admin/status', label: 'Status Penerima Bantuan', icon: 'status', uc: 'UC10' },
  { to: '/admin/riwayat', label: 'Riwayat Hasil Seleksi', icon: 'history', uc: 'UC04' },
];

const WARGA_LINKS = [
  { to: '/warga/data', label: 'Data Administratif', icon: 'edit', uc: 'UC06' },
  { to: '/warga/foto', label: 'Foto Kondisi Rumah', icon: 'image', uc: 'UC07' },
  { to: '/warga/status', label: 'Status Bantuan', icon: 'shield', uc: 'UC08' },
  { to: '/warga/profil', label: 'Profil Saya', icon: 'users', uc: 'UC09' },
];

export function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const links = user?.role === 'admin' ? ADMIN_LINKS : WARGA_LINKS;
  const roleLabel = user?.role === 'admin' ? 'Pengurus RT' : 'Warga';
  const displayName = user?.role === 'admin' ? 'Pengurus RT' : user?.nama || '';
  const initials = displayName.split(' ').slice(0, 2).map((s) => s[0]).join('').toUpperCase();

  return (
    <aside className={'sidebar' + (open ? ' open' : '')}>
      <div className="brand">
        <div className="brand-seal">RT</div>
        <div>
          <div className="brand-name">SIBANSOS</div>
          <div className="brand-sub">Asisten Pengurus RT</div>
        </div>
      </div>
      <nav className="nav">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} onClick={onClose}
            className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
            <Icon name={l.icon} />
            {l.label}
            <span className="nav-badge">{l.uc}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="user-chip">
          <div className="user-av">{initials || 'RT'}</div>
          <div style={{ flex: 1 }}>
            <div className="user-name">{displayName}</div>
            <div className="user-role">{roleLabel}</div>
          </div>
          <button className="iconbtn" onClick={logout} title="Keluar">
            <Icon name="close" />
          </button>
        </div>
      </div>
    </aside>
  );
}
