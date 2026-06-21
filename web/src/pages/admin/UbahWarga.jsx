import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';
import { Badge, Icon, tingkatPrioritas, useToast } from '../../components/ui';

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

  if (!form) return <div className="content-inner"><p>Memuat...</p></div>;

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
  const previewT = skorBaru != null ? tingkatPrioritas(skorBaru) : null;
  const toneColor = previewT && { red: 'var(--red)', amber: 'var(--amber)', blue: 'var(--blue-600)', gray: 'var(--faint)' }[previewT.tone];

  return (
    <div className="content-inner">
      <div className="page-intro">
        <span className="uc-tag"><Icon name="edit" /> UC05</span>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Ubah Data Warga — {form.nama}</h2>
        <p>Perbarui data warga bila terjadi perubahan kondisi. Skor prioritas dihitung ulang secara real-time dan validitas direset ke Menunggu setelah disimpan.</p>
      </div>

      <div className="ai-panel mt16" style={{ maxWidth: 520 }}>
        <div className="ai-head">
          <div className="ai-spark"><Icon name="sparkle" /></div>
          <div className="ai-title">
            Pratinjau Skor Prioritas
            <small>Diperbarui otomatis saat data berubah</small>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Skor Lama</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--faint)', lineHeight: 1.1 }}>{skorLama}</div>
          </div>
          <div style={{ fontSize: 22, color: 'var(--faint)' }}>→</div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Skor Baru</div>
            <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1, color: toneColor }}>{skorBaru}</div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            {previewT && <Badge tone={previewT.tone} dot={false}>{previewT.label}</Badge>}
            {delta !== 0 && (
              <div style={{ fontSize: 12, fontWeight: 700, marginTop: 5, color: delta > 0 ? 'var(--red)' : 'var(--green)' }}>
                {delta > 0 ? '▲' : '▼'} {Math.abs(delta)} poin
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card mt16" style={{ maxWidth: 520 }}>
        <form className="card-pad" onSubmit={handleSubmit}>
          <label className="input-label">Kategori Stabilitas Kerja</label>
          <select className="input" value={form.kategori_kerja} onChange={(e) => update('kategori_kerja', e.target.value)}>
            <option value="tetap">Tetap</option>
            <option value="serabutan">Serabutan</option>
            <option value="tidak_bekerja">Tidak Bekerja</option>
          </select>

          <label className="input-label mt12" style={{ display: 'block' }}>Pendapatan Keluarga / bulan (Rp)</label>
          <input className="input" type="number" min="0" value={form.pendapatan} onChange={(e) => update('pendapatan', e.target.value)} required />

          <label className="input-label mt12" style={{ display: 'block' }}>Jumlah Tanggungan</label>
          <input className="input" type="number" min="0" value={form.tanggungan} onChange={(e) => update('tanggungan', e.target.value)} required />

          <label className="input-label mt12" style={{ display: 'block' }}>Status Kepemilikan</label>
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
          <button className="btn btn-primary mt16" type="submit"><Icon name="check" /> Simpan Perubahan</button>
        </form>
      </div>
    </div>
  );
}
