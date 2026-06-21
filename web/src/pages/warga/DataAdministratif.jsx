import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useToast } from '../../components/ui';

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
    <div>
      <h1>Data Administratif</h1>
      <form className="card" onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <div className="field">
          <label>Kategori Stabilitas Kerja</label>
          <select value={form.kategori_kerja} onChange={(e) => update('kategori_kerja', e.target.value)}>
            <option value="tetap">Tetap</option>
            <option value="serabutan">Serabutan</option>
            <option value="tidak_bekerja">Tidak Bekerja</option>
          </select>
        </div>
        <div className="field">
          <label>Pekerjaan</label>
          <input value={form.pekerjaan} onChange={(e) => update('pekerjaan', e.target.value)} />
        </div>
        <div className="field">
          <label>Pendapatan Keluarga / bulan (Rp)</label>
          <input type="number" min="0" value={form.pendapatan} onChange={(e) => update('pendapatan', e.target.value)} required />
        </div>
        <div className="field">
          <label>Jumlah Tanggungan</label>
          <input type="number" min="0" value={form.tanggungan} onChange={(e) => update('tanggungan', e.target.value)} required />
        </div>
        <div className="field">
          <label>Status Kepemilikan Rumah</label>
          <select value={form.status_rumah} onChange={(e) => update('status_rumah', e.target.value)}>
            <option>Milik Sendiri</option>
            <option>Kontrak</option>
            <option>Menumpang</option>
          </select>
        </div>
        <div className="field">
          <label>Kondisi Rumah</label>
          <select value={form.kondisi_rumah} onChange={(e) => update('kondisi_rumah', e.target.value)}>
            <option>Layak</option>
            <option>Kurang Layak</option>
            <option>Tidak Layak</option>
          </select>
        </div>
        {error && <p style={{ color: 'var(--red)' }}>{error}</p>}
        <button className="btn btn-primary" type="submit">Simpan Data</button>
      </form>
    </div>
  );
}
