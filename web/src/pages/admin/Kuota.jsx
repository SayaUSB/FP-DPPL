import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useToast } from '../../components/ui';

export function Kuota() {
  const [active, setActive] = useState(null);
  const [form, setForm] = useState({ nama_bantuan: '', jenis_bantuan: '', kuota: '', nominal: '', periode: '' });
  const [error, setError] = useState('');
  const toast = useToast();

  function loadActive() {
    api.get('/api/admin/bantuan/active').then(setActive).catch(() => setActive(null));
  }
  useEffect(loadActive, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/admin/bantuan', form);
      toast('Periode dan kuota bantuan berhasil disimpan.', 'green');
      loadActive();
    } catch (err) {
      setError(err.message);
      toast(err.message, 'red');
    }
  }

  return (
    <div>
      <h1>Atur Kuota Penerima Bantuan</h1>
      {active && (
        <div className="card" style={{ marginBottom: 16 }}>
          <strong>Periode aktif saat ini:</strong> {active.periode} — Kuota {active.kuota} — {active.nama_bantuan}
        </div>
      )}
      <form className="card" onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <div className="field">
          <label>Nama Bantuan</label>
          <input value={form.nama_bantuan} onChange={(e) => setForm((f) => ({ ...f, nama_bantuan: e.target.value }))} required />
        </div>
        <div className="field">
          <label>Jenis Bantuan</label>
          <input value={form.jenis_bantuan} onChange={(e) => setForm((f) => ({ ...f, jenis_bantuan: e.target.value }))} />
        </div>
        <div className="field">
          <label>Kuota Penerima</label>
          <input type="number" min="1" value={form.kuota} onChange={(e) => setForm((f) => ({ ...f, kuota: e.target.value }))} required />
        </div>
        <div className="field">
          <label>Nominal per Penerima (Rp)</label>
          <input type="number" min="0" value={form.nominal} onChange={(e) => setForm((f) => ({ ...f, nominal: e.target.value }))} />
        </div>
        <div className="field">
          <label>Periode</label>
          <input value={form.periode} onChange={(e) => setForm((f) => ({ ...f, periode: e.target.value }))} placeholder="contoh: Triwulan II 2026" required />
        </div>
        {error && <p style={{ color: 'var(--red)' }}>{error}</p>}
        <button className="btn btn-primary" type="submit">Buka Periode Baru</button>
      </form>
    </div>
  );
}
