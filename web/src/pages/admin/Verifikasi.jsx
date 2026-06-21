import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { Badge, useToast } from '../../components/ui';

const VALIDITAS_META = {
  valid: { label: 'Valid', tone: 'green' },
  menunggu: { label: 'Menunggu', tone: 'amber' },
  perlu_perbaikan: { label: 'Perlu Perbaikan', tone: 'red' },
  tidak_valid: { label: 'Tidak Valid', tone: 'red' },
};

export function Verifikasi() {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const toast = useToast();

  function load() {
    const params = new URLSearchParams();
    if (filter) params.set('validitas', filter);
    if (search) params.set('search', search);
    api.get(`/api/admin/warga?${params}`).then(setList);
  }
  useEffect(load, [filter, search]);

  async function openDetail(id) {
    const detail = await api.get(`/api/admin/warga/${id}`);
    setSelected({
      ...detail,
      catatan_verifikasi: detail.catatan_verifikasi || '',
      chk_ktp: detail.chk_ktp, chk_kk: detail.chk_kk,
      chk_pendapatan: detail.chk_pendapatan, chk_foto: detail.chk_foto,
    });
  }

  async function saveValiditas(validitas) {
    try {
      await api.put(`/api/admin/warga/${selected.id}/validitas`, {
        validitas, catatan_verifikasi: selected.catatan_verifikasi,
        chk_ktp: selected.chk_ktp, chk_kk: selected.chk_kk,
        chk_pendapatan: selected.chk_pendapatan, chk_foto: selected.chk_foto,
      });
      toast('Status validitas berhasil disimpan.', 'green');
      setSelected(null);
      load();
    } catch (err) {
      toast(err.message, 'red');
    }
  }

  return (
    <div>
      <h1>Verifikasi Data Warga</h1>
      <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Semua</option>
          <option value="menunggu">Menunggu</option>
          <option value="valid">Valid</option>
          <option value="perlu_perbaikan">Perlu Perbaikan</option>
        </select>
        <input placeholder="Cari nama atau NIK" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Nama</th><th>NIK</th><th>Validitas</th><th></th></tr></thead>
          <tbody>
            {list.map((w) => (
              <tr key={w.id}>
                <td>{w.nama}</td>
                <td>{w.nik}</td>
                <td><Badge tone={VALIDITAS_META[w.validitas].tone}>{VALIDITAS_META[w.validitas].label}</Badge></td>
                <td>
                  <button className="btn" onClick={() => openDetail(w.id)}>Periksa</button>{' '}
                  <Link className="btn" to={`/admin/warga/${w.id}/ubah`}>Ubah</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="card" style={{ marginTop: 16, maxWidth: 480 }}>
          <h3>Periksa: {selected.nama}</h3>
          <p>Pendapatan: Rp {Number(selected.pendapatan || 0).toLocaleString('id-ID')} — Tanggungan: {selected.tanggungan}</p>
          <p>Foto kondisi rumah: {selected.foto.length} berkas terunggah</p>
          {['chk_ktp', 'chk_kk', 'chk_pendapatan', 'chk_foto'].map((key) => (
            <label key={key} style={{ display: 'block' }}>
              <input
                type="checkbox"
                checked={!!selected[key]}
                onChange={(e) => setSelected((s) => ({ ...s, [key]: e.target.checked }))}
              />{' '}
              {{ chk_ktp: 'KTP sesuai', chk_kk: 'KK valid', chk_pendapatan: 'Kewajaran pendapatan', chk_foto: 'Kelengkapan foto rumah' }[key]}
            </label>
          ))}
          <div className="field">
            <label>Catatan Verifikasi</label>
            <textarea
              value={selected.catatan_verifikasi}
              onChange={(e) => setSelected((s) => ({ ...s, catatan_verifikasi: e.target.value }))}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={() => saveValiditas('valid')}>Tetapkan Valid</button>
            <button className="btn" onClick={() => saveValiditas('perlu_perbaikan')}>Perlu Perbaikan</button>
            <button className="btn btn-ghost" onClick={() => setSelected(null)}>Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}
