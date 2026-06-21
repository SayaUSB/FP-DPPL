import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useToast } from '../../components/ui';

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
    <div>
      <h1>Profil Saya</h1>
      <form className="card" onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <div className="field">
          <label>Nama</label>
          <input value={form.nama} disabled />
        </div>
        <div className="field">
          <label>NIK</label>
          <input value={form.nik} disabled />
        </div>
        <div className="field">
          <label>Alamat</label>
          <textarea rows={2} value={form.alamat} onChange={(e) => setForm((f) => ({ ...f, alamat: e.target.value }))} />
        </div>
        <div className="field">
          <label>No. Telepon</label>
          <input value={form.no_telepon} onChange={(e) => setForm((f) => ({ ...f, no_telepon: e.target.value }))} />
        </div>
        {error && <p style={{ color: 'var(--red)' }}>{error}</p>}
        <button className="btn btn-primary" type="submit">Simpan Perubahan</button>
      </form>
    </div>
  );
}
