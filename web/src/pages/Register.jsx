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
    <div style={{ maxWidth: 360, margin: '80px auto' }}>
      <h1>Daftar Warga</h1>
      <form className="card" onSubmit={handleSubmit}>
        <div className="field">
          <label>Nama Lengkap</label>
          <input value={nama} onChange={(e) => setNama(e.target.value)} required />
        </div>
        <div className="field">
          <label>NIK</label>
          <input value={nik} onChange={(e) => setNik(e.target.value)} required />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p style={{ color: 'var(--red)' }}>{error}</p>}
        <button className="btn btn-primary" type="submit">Daftar</button>
      </form>
      <p>Sudah punya akun? <Link to="/login">Masuk di sini</Link></p>
    </div>
  );
}
