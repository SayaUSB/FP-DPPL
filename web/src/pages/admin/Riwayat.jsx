import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Avatar, Badge, Icon, ScoreChip } from '../../components/ui';

const STATUS_META = {
  penerima: { label: 'Penerima', tone: 'green' },
  cadangan: { label: 'Cadangan', tone: 'blue' },
  menunggu: { label: 'Menunggu', tone: 'amber' },
  bukan: { label: 'Bukan Penerima', tone: 'gray' },
};

function RiwayatDrawer({ detail, onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <Avatar nama={detail.nama} id={detail.warga_id} size={46} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em' }}>{detail.nama}</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>NIK {detail.nik}</div>
            <div className="mt8"><Badge tone={STATUS_META[detail.status].tone}>{STATUS_META[detail.status].label}</Badge></div>
          </div>
          <button className="iconbtn" onClick={onClose}><Icon name="close" /></button>
        </div>

        <div className="drawer-body">
          <div className="section-title" style={{ marginTop: 0 }}>Detail Hasil Seleksi</div>
          <div className="field-grid">
            <div className="field"><div className="field-label">Periode</div><div className="field-val">{detail.periode}</div></div>
            <div className="field"><div className="field-label">Nama Bantuan</div><div className="field-val">{detail.nama_bantuan}</div></div>
            <div className="field"><div className="field-label">Skor Prioritas</div><div className="field-val"><ScoreChip skor={detail.skor_prioritas} /></div></div>
            <div className="field"><div className="field-label">Tanggal Seleksi</div><div className="field-val">{new Date(detail.tanggal_seleksi).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div></div>
            <div className="field full"><div className="field-label">Catatan Keputusan</div><div className="field-val" style={{ fontSize: 13.5 }}>{detail.catatan || 'Tidak ada catatan.'}</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Riwayat() {
  const [list, setList] = useState([]);
  const [periode, setPeriode] = useState('');
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    const params = periode ? `?periode=${encodeURIComponent(periode)}` : '';
    api.get(`/api/admin/riwayat${params}`).then(setList);
  }, [periode]);

  const periodeOptions = [...new Set(list.map((r) => r.periode))];

  function openDetail(id) {
    api.get(`/api/admin/riwayat/${id}`).then(setDetail);
  }

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
              <tr><th>Periode</th><th>Nama</th><th>NIK</th><th>Skor</th><th>Status</th><th>Catatan</th><th></th></tr>
            </thead>
            <tbody>
              {list.map((row) => (
                <tr key={row.id} onClick={() => openDetail(row.id)}>
                  <td>{row.periode}</td>
                  <td className="cell-name">{row.nama}</td>
                  <td>{row.nik}</td>
                  <td style={{ fontWeight: 700 }}>{row.skor_prioritas}</td>
                  <td><Badge tone={STATUS_META[row.status].tone}>{STATUS_META[row.status].label}</Badge></td>
                  <td className="cell-meta">{row.catatan || '-'}</td>
                  <td className="num">
                    <button className="btn btn-soft btn-sm" onClick={(e) => { e.stopPropagation(); openDetail(row.id); }} type="button">Lihat Detail</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.length === 0 && (
          <div className="empty"><Icon name="history" /><div>Belum ada riwayat seleksi pada periode yang dipilih.</div></div>
        )}
      </div>

      {detail && <RiwayatDrawer detail={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
