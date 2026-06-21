import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Card } from '../../components/ui';

export function Statistik() {
  const [stats, setStats] = useState(null);

  useEffect(() => { api.get('/api/admin/statistik').then(setStats); }, []);

  if (!stats) return <p>Memuat...</p>;

  function exportFile(format) {
    window.open(`/api/admin/statistik/export?format=${format}`, '_blank');
  }

  return (
    <div>
      <h1>Statistik & Beranda</h1>
      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <Card title="Total Warga"><h2>{stats.totalWarga}</h2></Card>
        <Card title="Kuota / Penerima"><h2>{stats.totalPenerima} / {stats.kuota}</h2></Card>
        <Card title="Data Valid"><h2>{stats.totalValid}</h2></Card>
        <Card title="Rata-rata Pendapatan"><h2>Rp {stats.rataRataPendapatan.toLocaleString('id-ID')}</h2></Card>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <Card title="Distribusi Pendapatan per Kapita">
          {stats.distribusiPendapatan.map((d) => (
            <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span>{d.label}</span><strong>{d.jumlah}</strong>
            </div>
          ))}
        </Card>
        <Card title="Status Validitas">
          {Object.entries(stats.donutValiditas).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span>{k}</span><strong>{v}</strong>
            </div>
          ))}
        </Card>
      </div>

      <Card title="Distribusi Prioritas (Asisten AI)" actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => exportFile('excel')}>Unduh Excel</button>
          <button className="btn" onClick={() => exportFile('pdf')}>Unduh PDF</button>
        </div>
      }>
        {Object.entries(stats.histogramPrioritas).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span>{k}</span><strong>{v}</strong>
          </div>
        ))}
      </Card>
    </div>
  );
}
