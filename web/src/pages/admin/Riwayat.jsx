import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Badge, Icon } from '../../components/ui';

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
    <div className="content-inner">
      <div className="page-intro">
        <span className="uc-tag"><Icon name="history" /> UC04</span>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Riwayat Hasil Seleksi</h2>
        <p>Akses dan filter hasil seleksi penerima bantuan dari periode-periode sebelumnya sebagai bahan evaluasi dan pertanggungjawaban.</p>
      </div>

      <div className="toolbar">
        <select className="select" value={periode} onChange={(e) => setPeriode(e.target.value)}>
          <option value="">Semua Periode</option>
          {periodeOptions.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Periode</th><th>Nama</th><th>NIK</th><th>Skor</th><th>Status</th><th>Catatan</th></tr>
            </thead>
            <tbody>
              {list.map((row) => (
                <tr key={row.id}>
                  <td>{row.periode}</td>
                  <td className="cell-name">{row.nama}</td>
                  <td>{row.nik}</td>
                  <td style={{ fontWeight: 700 }}>{row.skor_prioritas}</td>
                  <td><Badge tone={STATUS_META[row.status].tone}>{STATUS_META[row.status].label}</Badge></td>
                  <td className="cell-meta">{row.catatan || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.length === 0 && (
          <div className="empty"><Icon name="history" /><div>Belum ada riwayat seleksi pada periode yang dipilih.</div></div>
        )}
      </div>
    </div>
  );
}
