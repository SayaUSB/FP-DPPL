import { useEffect, useState } from 'react';
import { api } from '../../api';
import { BarChart, Donut, Icon } from '../../components/ui';

const VALIDITAS_COLOR = {
  valid: 'var(--green)', menunggu: 'var(--amber)', perlu_perbaikan: 'var(--red)', tidak_valid: 'var(--red)',
};
const VALIDITAS_LABEL = {
  valid: 'Valid', menunggu: 'Menunggu', perlu_perbaikan: 'Perlu Perbaikan', tidak_valid: 'Tidak Valid',
};
const PRIORITAS_COLOR = ['var(--red)', 'var(--amber)', 'var(--blue-500)', 'var(--faint)'];

export function Statistik() {
  const [stats, setStats] = useState(null);

  useEffect(() => { api.get('/api/admin/statistik').then(setStats); }, []);

  if (!stats) return <div className="content-inner"><p>Memuat...</p></div>;

  function exportFile(format) {
    window.open(`/api/admin/statistik/export?format=${format}`, '_blank');
  }

  const kuotaTerisi = stats.totalPenerima;
  const kuotaPersen = stats.kuota ? Math.min(100, (kuotaTerisi / stats.kuota) * 100) : 0;

  const statCards = [
    { label: 'Total Warga Terdaftar', val: stats.totalWarga, icon: 'users', bg: 'var(--blue-50)', fg: 'var(--blue-700)', delta: 'KK terdaftar' },
    { label: 'Penerima Ditetapkan', val: `${stats.totalPenerima}/${stats.kuota}`, icon: 'shield', bg: 'var(--green-bg)', fg: 'oklch(0.45 0.11 150)', delta: `${Math.max(0, stats.kuota - kuotaTerisi)} kuota tersisa` },
    { label: 'Data Tervalidasi', val: stats.totalValid, icon: 'verify', bg: 'var(--blue-50)', fg: 'var(--blue-700)', delta: `${stats.donutValiditas.menunggu} menunggu diperiksa` },
    { label: 'Rata-rata Pendapatan', val: 'Rp ' + Math.round(stats.rataRataPendapatan / 1000) + 'rb', icon: 'coins', bg: 'var(--amber-bg)', fg: 'oklch(0.5 0.1 60)', delta: 'per KK / bulan' },
  ];

  const validitasSeg = Object.entries(stats.donutValiditas).map(([k, v]) => ({ label: VALIDITAS_LABEL[k], value: v, color: VALIDITAS_COLOR[k] }));

  return (
    <div className="content-inner">
      <div className="spread page-intro" style={{ alignItems: 'flex-start' }}>
        <div>
          <span className="uc-tag"><Icon name="chart" /> UC03</span>
          <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Statistik Warga & Bantuan</h2>
          <p>Ringkasan kondisi warga dan progres penyaluran bantuan untuk periode berjalan. Data dapat diunduh sebagai bahan evaluasi dan pertanggungjawaban.</p>
        </div>
        <div className="row no-print">
          <button className="btn btn-ghost" onClick={() => exportFile('pdf')}><Icon name="doc" /> PDF</button>
          <button className="btn btn-primary" onClick={() => exportFile('excel')}><Icon name="download" /> Excel</button>
        </div>
      </div>

      <div className="stat-grid">
        {statCards.map((s, i) => (
          <div className="stat" key={i}>
            <div className="stat-ico" style={{ background: s.bg, color: s.fg }}><Icon name={s.icon} /></div>
            <div className="stat-val">{s.val}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-delta" style={{ color: 'var(--muted)' }}>{s.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid-3 mt16">
        <div className="card">
          <div className="card-head">
            <Icon name="chart" />
            <div><h3>Distribusi Pendapatan per Kapita</h3><div className="sub">Jumlah KK menurut kelas penghasilan</div></div>
          </div>
          <div className="card-pad">
            <BarChart data={stats.distribusiPendapatan.map((d, i) => ({ label: d.label, value: d.jumlah, color: PRIORITAS_COLOR[Math.min(i, PRIORITAS_COLOR.length - 1)] }))} />
          </div>
        </div>

        <div className="card">
          <div className="card-head"><Icon name="verify" /><div><h3>Status Validitas</h3></div></div>
          <div className="card-pad">
            <div className="donut-wrap">
              <Donut segments={validitasSeg} total={stats.totalWarga} centerBig={stats.totalWarga} centerSmall="Total KK" />
              <div className="legend">
                {validitasSeg.map((s, i) => (
                  <div className="legend-row" key={i}>
                    <span className="sw" style={{ background: s.color }} />
                    <span className="lg-name">{s.label}</span>
                    <span className="lg-val">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mt16">
        <div className="card-head">
          <Icon name="sparkle" />
          <div style={{ flex: 1 }}><h3>Distribusi Tingkat Prioritas (Asisten AI)</h3><div className="sub">Hasil skoring kebutuhan dari data administratif & kondisi rumah</div></div>
        </div>
        <div className="card-pad">
          <BarChart data={Object.entries(stats.histogramPrioritas).map(([label, value], i) => ({ label, value, color: PRIORITAS_COLOR[i] }))} />
        </div>
      </div>
    </div>
  );
}
