import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Register() {
  const [nama, setNama] = useState('');
  const [nik, setNik] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await register(nama, nik, password);
      navigate('/warga/data');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 360 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div className="brand-seal" style={{ width: 44, height: 44 }}>RT</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em' }}>SIBANSOS</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Asisten Pengurus RT</div>
          </div>
        </div>
        <div className="card card-pad">
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Daftar Warga</h2>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 18 }}>Buat akun untuk mengisi data administratif dan memantau status bantuan.</p>
          <form onSubmit={handleSubmit}>
            <label className="input-label">Nama Lengkap</label>
            <input className="input" value={nama} onChange={(e) => setNama(e.target.value)} required />
            <label className="input-label mt12" style={{ display: 'block' }}>NIK</label>
            <input className="input" value={nik} onChange={(e) => setNik(e.target.value)} required />
            <label className="input-label mt12" style={{ display: 'block' }}>Password</label>
            <input className="input" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
            {error && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 10 }}>{error}</div>}
            <button className="btn btn-primary mt16" type="submit" style={{ width: '100%' }}>Daftar</button>
          </form>
        </div>
        <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--muted)', marginTop: 16 }}>
          Sudah punya akun? <Link to="/login" style={{ color: 'var(--blue-700)', fontWeight: 700 }}>Masuk di sini</Link>
        </p>
      </div>
    </div>
  );
}
