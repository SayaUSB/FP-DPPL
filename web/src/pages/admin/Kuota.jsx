import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Icon, useToast } from '../../components/ui';

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
    <div className="content-inner">
      <div className="page-intro">
        <span className="uc-tag"><Icon name="coins" /> UC01</span>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Atur Kuota Penerima Bantuan</h2>
        <p>Tentukan jumlah maksimal penerima dan periode bantuan. Membuka periode baru menutup periode sebelumnya dan memindahkannya ke Riwayat.</p>
      </div>

      {active && (
        <div className="card card-pad" style={{ marginBottom: 16, display: 'flex', gap: 18, alignItems: 'center' }}>
          <div className="stat-ico" style={{ background: 'var(--green-bg)', color: 'oklch(0.45 0.11 150)', margin: 0 }}>
            <Icon name="shield" />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Periode Aktif</div>
            <div style={{ fontSize: 15, fontWeight: 800, marginTop: 2 }}>{active.periode} — {active.nama_bantuan}</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>Kuota maksimal {active.kuota} penerima</div>
          </div>
        </div>
      )}

      <div className="card" style={{ maxWidth: 480 }}>
        <form className="card-pad" onSubmit={handleSubmit}>
          <label className="input-label">Nama Bantuan</label>
          <input className="input" value={form.nama_bantuan} onChange={(e) => setForm((f) => ({ ...f, nama_bantuan: e.target.value }))} required />

          <label className="input-label mt12" style={{ display: 'block' }}>Jenis Bantuan</label>
          <input className="input" value={form.jenis_bantuan} onChange={(e) => setForm((f) => ({ ...f, jenis_bantuan: e.target.value }))} />

          <label className="input-label mt12" style={{ display: 'block' }}>Kuota Penerima</label>
          <input className="input" type="number" min="1" value={form.kuota} onChange={(e) => setForm((f) => ({ ...f, kuota: e.target.value }))} required />

          <label className="input-label mt12" style={{ display: 'block' }}>Nominal per Penerima (Rp)</label>
          <input className="input" type="number" min="0" value={form.nominal} onChange={(e) => setForm((f) => ({ ...f, nominal: e.target.value }))} />

          <label className="input-label mt12" style={{ display: 'block' }}>Periode</label>
          <input className="input" value={form.periode} onChange={(e) => setForm((f) => ({ ...f, periode: e.target.value }))} placeholder="contoh: Triwulan II 2026" required />

          {error && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 10 }}>{error}</div>}
          <button className="btn btn-primary mt16" type="submit"><Icon name="check" /> Buka Periode Baru</button>
        </form>
      </div>
    </div>
  );
}
