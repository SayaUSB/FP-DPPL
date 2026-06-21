import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Icon, useToast } from '../../components/ui';

const EMPTY = {
  kategori_kerja: 'serabutan', pekerjaan: '', pendapatan: '', tanggungan: '',
  status_rumah: 'Kontrak', kondisi_rumah: 'Kurang Layak',
};

export function DataAdministratif() {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const toast = useToast();

  useEffect(() => {
    api.get('/api/warga/me/profile').then((p) => {
      if (p.data_administratif) {
        setForm({
          kategori_kerja: p.data_administratif.kategori_kerja || 'serabutan',
          pekerjaan: p.data_administratif.pekerjaan || '',
          pendapatan: p.data_administratif.pendapatan ?? '',
          tanggungan: p.data_administratif.tanggungan ?? '',
          status_rumah: p.data_administratif.status_rumah || 'Kontrak',
          kondisi_rumah: p.data_administratif.kondisi_rumah || 'Kurang Layak',
        });
      }
    });
  }, []);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.put('/api/warga/me/data-administratif', form);
      toast('Data administratif berhasil disimpan.', 'green');
    } catch (err) {
      setError(err.message);
      toast(err.message, 'red');
    }
  }

  return (
    <div className="content-inner">
      <div className="page-intro">
        <span className="uc-tag"><Icon name="edit" /> UC06</span>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Data Administratif</h2>
        <p>Isi data pekerjaan, pendapatan, dan kondisi rumah Anda. Data ini menjadi dasar perhitungan skor prioritas penerima bantuan.</p>
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        <form className="card-pad" onSubmit={handleSubmit}>
          <label className="input-label">Kategori Stabilitas Kerja</label>
          <select className="input" value={form.kategori_kerja} onChange={(e) => update('kategori_kerja', e.target.value)}>
            <option value="tetap">Tetap</option>
            <option value="serabutan">Serabutan</option>
            <option value="tidak_bekerja">Tidak Bekerja</option>
          </select>

          <label className="input-label mt12" style={{ display: 'block' }}>Pekerjaan</label>
          <input className="input" value={form.pekerjaan} onChange={(e) => update('pekerjaan', e.target.value)} />

          <label className="input-label mt12" style={{ display: 'block' }}>Pendapatan Keluarga / bulan (Rp)</label>
          <input className="input" type="number" min="0" value={form.pendapatan} onChange={(e) => update('pendapatan', e.target.value)} required />

          <label className="input-label mt12" style={{ display: 'block' }}>Jumlah Tanggungan</label>
          <input className="input" type="number" min="0" value={form.tanggungan} onChange={(e) => update('tanggungan', e.target.value)} required />

          <label className="input-label mt12" style={{ display: 'block' }}>Status Kepemilikan Rumah</label>
          <select className="input" value={form.status_rumah} onChange={(e) => update('status_rumah', e.target.value)}>
            <option>Milik Sendiri</option>
            <option>Kontrak</option>
            <option>Menumpang</option>
          </select>

          <label className="input-label mt12" style={{ display: 'block' }}>Kondisi Rumah</label>
          <select className="input" value={form.kondisi_rumah} onChange={(e) => update('kondisi_rumah', e.target.value)}>
            <option>Layak</option>
            <option>Kurang Layak</option>
            <option>Tidak Layak</option>
          </select>

          {error && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 10 }}>{error}</div>}
          <button className="btn btn-primary mt16" type="submit"><Icon name="check" /> Simpan Data</button>
        </form>
      </div>
    </div>
  );
}
