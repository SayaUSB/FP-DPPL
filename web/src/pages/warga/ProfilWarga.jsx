import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Icon, useToast } from '../../components/ui';

export function ProfilWarga() {
  const [form, setForm] = useState({ nama: '', nik: '', alamat: '', no_telepon: '' });
  const [error, setError] = useState('');
  const toast = useToast();

  useEffect(() => {
    api.get('/api/warga/me/profile').then((p) => {
      setForm({ nama: p.nama, nik: p.nik, alamat: p.alamat || '', no_telepon: p.no_telepon || '' });
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.put('/api/warga/me/profile', { alamat: form.alamat, no_telepon: form.no_telepon });
      toast('Profil berhasil diperbarui. Status validitas direset ke Menunggu.', 'amber');
    } catch (err) {
      setError(err.message);
      toast(err.message, 'red');
    }
  }

  return (
    <div className="content-inner">
      <div className="page-intro">
        <span className="uc-tag"><Icon name="users" /> UC09</span>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Profil Saya</h2>
        <p>Perbarui alamat dan kontak Anda. Perubahan data akan mereset status validitas menjadi Menunggu hingga diperiksa ulang oleh pengurus RT.</p>
      </div>

      <div className="card" style={{ maxWidth: 480 }}>
        <form className="card-pad" onSubmit={handleSubmit}>
          <label className="input-label">Nama</label>
          <input className="input" value={form.nama} disabled />

          <label className="input-label mt12" style={{ display: 'block' }}>NIK</label>
          <input className="input" value={form.nik} disabled />

          <label className="input-label mt12" style={{ display: 'block' }}>Alamat</label>
          <textarea className="input" rows={2} value={form.alamat} onChange={(e) => setForm((f) => ({ ...f, alamat: e.target.value }))} />

          <label className="input-label mt12" style={{ display: 'block' }}>No. Telepon</label>
          <input className="input" value={form.no_telepon} onChange={(e) => setForm((f) => ({ ...f, no_telepon: e.target.value }))} />

          {error && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 10 }}>{error}</div>}
          <button className="btn btn-primary mt16" type="submit"><Icon name="check" /> Simpan Perubahan</button>
        </form>
      </div>
    </div>
  );
}
