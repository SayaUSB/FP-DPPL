import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Badge, useToast } from '../../components/ui';

const STATUS_META = {
  penerima: { label: 'Penerima', tone: 'green' },
  cadangan: { label: 'Cadangan', tone: 'blue' },
  menunggu: { label: 'Menunggu', tone: 'amber' },
  bukan: { label: 'Bukan Penerima', tone: 'gray' },
};

export function StatusSeleksi() {
  const [list, setList] = useState([]);
  const [active, setActive] = useState(null);
  const toast = useToast();

  function load() {
    api.get('/api/admin/bantuan/active').then(setActive).catch(() => setActive(null));
    api.get('/api/admin/seleksi').then(setList).catch(() => setList([]));
  }
  useEffect(load, []);

  const terisi = list.filter((r) => r.status === 'penerima').length;
  const overQuota = active && terisi > active.kuota;

  async function setStatus(row, status) {
    if ((row.validitas === 'menunggu' || row.validitas === 'perlu_perbaikan') && status === 'penerima') {
      toast('Peringatan: data warga ini belum Valid. Tetap dilanjutkan atas keputusan Pengurus RT.', 'amber');
    }
    try {
      await api.put(`/api/admin/seleksi/${row.id}`, { status, catatan: row.catatan });
      toast('Status bantuan berhasil diperbarui dan notifikasi terkirim ke warga.', 'green');
      load();
    } catch (err) {
      toast(err.message, 'red');
    }
  }

  return (
    <div>
      <h1>Status Penerima Bantuan</h1>
      {active && (
        <div className="card" style={{ marginBottom: 16 }}>
          <strong>Kuota terisi: {terisi} / {active.kuota}</strong>
          <div className={`quota-bar ${overQuota ? 'over' : ''}`} style={{ marginTop: 8 }}>
            <div style={{ width: `${Math.min(100, (terisi / active.kuota) * 100)}%` }} />
          </div>
          {overQuota && <p style={{ color: 'var(--red)' }}>Kuota terlampaui (Over Quota)!</p>}
        </div>
      )}
      <div className="card">
        <table>
          <thead><tr><th>Nama</th><th>NIK</th><th>Skor</th><th>Validitas</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id}>
                <td>{row.nama}</td>
                <td>{row.nik}</td>
                <td>{row.skor_prioritas}</td>
                <td>{row.validitas}</td>
                <td><Badge tone={STATUS_META[row.status].tone}>{STATUS_META[row.status].label}</Badge></td>
                <td>
                  <select value={row.status} onChange={(e) => setStatus(row, e.target.value)}>
                    <option value="menunggu">Menunggu</option>
                    <option value="penerima">Penerima</option>
                    <option value="cadangan">Cadangan</option>
                    <option value="bukan">Bukan Penerima</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
