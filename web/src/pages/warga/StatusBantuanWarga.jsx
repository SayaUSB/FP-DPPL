import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Badge } from '../../components/ui';

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

  if (!data) return <p>Memuat...</p>;
  const meta = STATUS_META[data.status] || STATUS_META.belum_diseleksi;

  return (
    <div>
      <h1>Status Penerimaan Bantuan</h1>
      <div className="card" style={{ maxWidth: 480 }}>
        {data.bantuan && <p><strong>Periode:</strong> {data.bantuan.periode} ({data.bantuan.nama_bantuan})</p>}
        <p><strong>Status:</strong> <Badge tone={meta.tone}>{meta.label}</Badge></p>
        {data.catatan && <p><strong>Catatan Pengurus RT:</strong> {data.catatan}</p>}
      </div>
    </div>
  );
}
