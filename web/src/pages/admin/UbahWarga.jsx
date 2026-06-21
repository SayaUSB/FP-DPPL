import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';
import { useToast } from '../../components/ui';

export function UbahWarga() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [skorLama, setSkorLama] = useState(null);
  const [skorBaru, setSkorBaru] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/api/admin/warga/${id}`).then((w) => {
      setForm({
        nama: w.nama, alamat: w.alamat || '', no_telepon: w.no_telepon || '',
        kategori_kerja: w.kategori_kerja || 'serabutan', pekerjaan: w.pekerjaan || '',
        pendapatan: w.pendapatan ?? '', tanggungan: w.tanggungan ?? '',
        status_rumah: w.status_rumah || 'Kontrak', kondisi_rumah: w.kondisi_rumah || 'Kurang Layak',
      });
      setSkorLama(w.skor_prioritas);
      setSkorBaru(w.skor_prioritas);
    });
  }, [id]);

  useEffect(() => {
    if (!form || form.pendapatan === '' || form.tanggungan === '') return;
    const timer = setTimeout(() => {
      api.post('/api/admin/skor-preview', {
        pendapatan: form.pendapatan, tanggungan: form.tanggungan,
        kondisiRumah: form.kondisi_rumah, statusRumah: form.status_rumah, kategoriKerja: form.kategori_kerja,
      }).then((r) => setSkorBaru(r.skor));
    }, 250);
    return () => clearTimeout(timer);
  }, [form]);

  if (!form) return <p>Memuat...</p>;

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.put(`/api/admin/warga/${id}`, form);
      toast('Data warga berhasil diperbarui. Validitas direset ke Menunggu.', 'amber');
      navigate('/admin/verifikasi');
    } catch (err) {
      setError(err.message);
      toast(err.message, 'red');
    }
  }

  const delta = skorBaru != null && skorLama != null ? skorBaru - skorLama : 0;

  return (
    <div>
      <h1>Ubah Data Warga — {form.nama}</h1>
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
          <label>Pendapatan Keluarga / bulan (Rp)</label>
          <input type="number" min="0" value={form.pendapatan} onChange={(e) => update('pendapatan', e.target.value)} required />
        </div>
        <div className="field">
          <label>Jumlah Tanggungan</label>
          <input type="number" min="0" value={form.tanggungan} onChange={(e) => update('tanggungan', e.target.value)} required />
        </div>
        <div className="field">
          <label>Status Kepemilikan</label>
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

        <div className="card" style={{ background: 'var(--bg)', marginBottom: 12 }}>
          <strong>Pratinjau Skor Prioritas (Real-time)</strong>
          <p style={{ fontSize: 24, margin: '4px 0' }}>
            {skorBaru} / 100{' '}
            {delta !== 0 && (
              <span style={{ color: delta > 0 ? 'var(--red)' : 'var(--green)', fontSize: 14 }}>
                ({delta > 0 ? '+' : ''}{delta} dari skor lama {skorLama})
              </span>
            )}
          </p>
        </div>

        {error && <p style={{ color: 'var(--red)' }}>{error}</p>}
        <button className="btn btn-primary" type="submit">Simpan Perubahan</button>
      </form>
    </div>
  );
}
