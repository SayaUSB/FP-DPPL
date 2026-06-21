import { useState } from 'react';
import { api } from '../../api';
import { Icon, useToast } from '../../components/ui';

const JENIS_LIST = [
  { value: 'eksterior', label: 'Eksterior' },
  { value: 'interior', label: 'Interior' },
  { value: 'lingkungan', label: 'Lingkungan' },
];

export function FotoRumah() {
  const [jenis, setJenis] = useState('eksterior');
  const [file, setFile] = useState(null);
  const [deskripsi, setDeskripsi] = useState('');
  const [error, setError] = useState('');
  const toast = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!file) { setError('Pilih file foto terlebih dahulu.'); return; }
    const formData = new FormData();
    formData.append('jenis', jenis);
    formData.append('deskripsi', deskripsi);
    formData.append('foto', file);
    try {
      await api.postForm('/api/warga/me/foto', formData);
      toast('Foto berhasil diunggah.', 'green');
      setFile(null);
      setDeskripsi('');
    } catch (err) {
      setError(err.message);
      toast(err.message, 'red');
    }
  }

  return (
    <div className="content-inner">
      <div className="page-intro">
        <span className="uc-tag"><Icon name="image" /> UC07</span>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Unggah Foto Kondisi Rumah</h2>
        <p>Unggah foto eksterior, interior, dan lingkungan rumah sebagai bahan verifikasi pengurus RT.</p>
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        <form className="card-pad" onSubmit={handleSubmit}>
          <label className="input-label">Jenis Foto</label>
          <select className="input" value={jenis} onChange={(e) => setJenis(e.target.value)}>
            {JENIS_LIST.map((j) => <option key={j.value} value={j.value}>{j.label}</option>)}
          </select>

          <label className="input-label mt12" style={{ display: 'block' }}>File Foto</label>
          <input className="input" type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} required />

          <label className="input-label mt12" style={{ display: 'block' }}>Deskripsi (opsional)</label>
          <textarea className="input" value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} rows={3} />

          {error && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 10 }}>{error}</div>}
          <button className="btn btn-primary mt16" type="submit"><Icon name="upload" /> Unggah Foto</button>
        </form>
      </div>
    </div>
  );
}
