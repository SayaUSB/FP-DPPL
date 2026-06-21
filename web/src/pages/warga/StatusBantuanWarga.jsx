import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Badge, Icon } from '../../components/ui';

const STATUS_META = {
  penerima: { label: 'Penerima', tone: 'green' },
  cadangan: { label: 'Daftar Cadangan', tone: 'blue' },
  menunggu: { label: 'Menunggu', tone: 'amber' },
  bukan: { label: 'Bukan Penerima', tone: 'gray' },
  belum_diseleksi: { label: 'Belum Diseleksi', tone: 'gray' },
};

export function StatusBantuanWarga() {
  const [data, setData] = useState(null);

  useEffect(() => { api.get('/api/warga/me/status').then(setData); }, []);

  if (!data) return <div className="content-inner"><p>Memuat...</p></div>;
  const meta = STATUS_META[data.status] || STATUS_META.belum_diseleksi;

  return (
    <div className="content-inner">
      <div className="page-intro">
        <span className="uc-tag"><Icon name="shield" /> UC08</span>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Status Penerimaan Bantuan</h2>
        <p>Lihat status penerimaan bantuan sosial Anda pada periode yang sedang berjalan.</p>
      </div>

      <div className="card card-pad" style={{ maxWidth: 480 }}>
        {data.bantuan ? (
          <>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Periode</div>
            <div style={{ fontSize: 15, fontWeight: 800, marginTop: 3 }}>{data.bantuan.periode} — {data.bantuan.nama_bantuan}</div>
          </>
        ) : (
          <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>Belum ada periode bantuan yang dibuka.</div>
        )}
        <div className="mt16"><Badge tone={meta.tone}>{meta.label}</Badge></div>
        {data.catatan && (
          <div className="mt16">
            <div className="input-label">Catatan Pengurus RT</div>
            <p style={{ fontSize: 13.5, color: 'var(--ink-2)', marginTop: 4 }}>{data.catatan}</p>
          </div>
        )}
      </div>
    </div>
  );
}
