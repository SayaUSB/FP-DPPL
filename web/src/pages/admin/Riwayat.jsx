import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Badge } from '../../components/ui';

const STATUS_META = {
  penerima: { label: 'Penerima', tone: 'green' },
  cadangan: { label: 'Cadangan', tone: 'blue' },
  menunggu: { label: 'Menunggu', tone: 'amber' },
  bukan: { label: 'Bukan Penerima', tone: 'gray' },
};

export function Riwayat() {
  const [list, setList] = useState([]);
  const [periode, setPeriode] = useState('');

  useEffect(() => {
    const params = periode ? `?periode=${encodeURIComponent(periode)}` : '';
    api.get(`/api/admin/riwayat${params}`).then(setList);
  }, [periode]);

  const periodeOptions = [...new Set(list.map((r) => r.periode))];

  return (
    <div>
      <h1>Riwayat Hasil Seleksi</h1>
      <div className="card" style={{ marginBottom: 16 }}>
        <select value={periode} onChange={(e) => setPeriode(e.target.value)}>
          <option value="">Semua Periode</option>
          {periodeOptions.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Periode</th><th>Nama</th><th>NIK</th><th>Skor</th><th>Status</th><th>Catatan</th></tr></thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id}>
                <td>{row.periode}</td>
                <td>{row.nama}</td>
                <td>{row.nik}</td>
                <td>{row.skor_prioritas}</td>
                <td><Badge tone={STATUS_META[row.status].tone}>{STATUS_META[row.status].label}</Badge></td>
                <td>{row.catatan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
