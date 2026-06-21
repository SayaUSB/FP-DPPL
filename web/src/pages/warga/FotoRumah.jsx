import { useState } from 'react';
import { api } from '../../api';
import { useToast } from '../../components/ui';

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
    <div>
      <h1>Unggah Foto Kondisi Rumah</h1>
      <form className="card" onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <div className="field">
          <label>Jenis Foto</label>
          <select value={jenis} onChange={(e) => setJenis(e.target.value)}>
            {JENIS_LIST.map((j) => <option key={j.value} value={j.value}>{j.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label>File Foto</label>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} required />
        </div>
        <div className="field">
          <label>Deskripsi (opsional)</label>
          <textarea value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} rows={3} />
        </div>
        {error && <p style={{ color: 'var(--red)' }}>{error}</p>}
        <button className="btn btn-primary" type="submit">Unggah Foto</button>
      </form>
    </div>
  );
}
