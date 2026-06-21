import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Avatar, Badge, Icon, QuotaBar, ScoreChip, useToast } from '../../components/ui';

const STATUS_META = {
  penerima: { label: 'Penerima', tone: 'green' },
  cadangan: { label: 'Cadangan', tone: 'blue' },
  menunggu: { label: 'Menunggu', tone: 'amber' },
  bukan: { label: 'Bukan Penerima', tone: 'gray' },
};

const OPSI = [
  { v: 'penerima', title: 'Penerima Bantuan', sub: 'Ditetapkan menerima bantuan periode ini', tone: 'green' },
  { v: 'cadangan', title: 'Daftar Cadangan', sub: 'Menerima jika ada kuota tambahan', tone: 'blue' },
  { v: 'bukan', title: 'Bukan Penerima', sub: 'Belum memenuhi kriteria periode ini', tone: 'gray' },
];

function AIPanel({ rek }) {
  if (!rek) return <p style={{ fontSize: 13, color: 'var(--muted)' }}>Memuat rekomendasi...</p>;
  return (
    <div className="ai-panel">
      <div className="ai-head">
        <div className="ai-spark"><Icon name="sparkle" /></div>
        <div className="ai-title">
          Rekomendasi Prioritas
          <small>ASISTEN AI · SKOR {rek.skor}/100</small>
        </div>
        <div style={{ marginLeft: 'auto' }}><Badge tone={rek.tingkat.tone} dot={false}>{rek.tingkat.label}</Badge></div>
      </div>
      <div className="ai-rec">{rek.teks}</div>
      <div className="factor-list">
        {rek.faktor.map((f, i) => (
          <div className="factor" key={i}>
            <div className="factor-top">
              <span className="fn">{f.nama}</span>
              <span className="fv">{f.nilai.toFixed(0)}<span style={{ color: 'var(--faint)', fontWeight: 600 }}>/{f.max}</span></span>
            </div>
            <div className="factor-track"><span style={{ width: (f.nilai / f.max * 100) + '%' }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusDrawer({ row, onClose, onSimpan }) {
  const [status, setStatus] = useState(row.status === 'menunggu' ? '' : row.status);
  const [catatan, setCatatan] = useState(row.catatan || '');
  const [rek, setRek] = useState(null);
  const validBlocked = row.validitas !== 'valid';

  useEffect(() => {
    api.get(`/api/admin/warga/${row.warga_id}/rekomendasi`).then(setRek);
  }, [row.warga_id]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <Avatar nama={row.nama} id={row.warga_id} size={46} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em' }}>{row.nama}</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>NIK {row.nik}</div>
            <div className="mt8 row" style={{ gap: 7 }}>
              <Badge tone={validBlocked ? 'amber' : 'green'}>{row.validitas}</Badge>
              <Badge tone={STATUS_META[row.status].tone}>{STATUS_META[row.status].label}</Badge>
            </div>
          </div>
          <button className="iconbtn" onClick={onClose}><Icon name="close" /></button>
        </div>

        <div className="drawer-body">
          <AIPanel rek={rek} />

          {validBlocked && (
            <div className="card-pad mt16" style={{ background: 'var(--amber-bg)', border: '1px solid color-mix(in oklch, var(--amber) 35%, white)', borderRadius: 'var(--radius)', display: 'flex', gap: 11, alignItems: 'flex-start' }}>
              <Icon name="alert" />
              <div style={{ fontSize: 12.5, color: 'oklch(0.42 0.09 60)', fontWeight: 600 }}>
                Data warga ini belum berstatus <b>Valid</b>. Sebaiknya selesaikan verifikasi (UC02) sebelum menetapkannya sebagai penerima.
              </div>
            </div>
          )}

          <div className="section-title">Tetapkan Status Penerimaan</div>
          <div className="radio-cards">
            {OPSI.map((o) => (
              <button key={o.v} className={'radio-card' + (status === o.v ? ' sel' : '')} onClick={() => setStatus(o.v)} type="button">
                <span className="radio-dot" />
                <span className="radio-main">
                  <span className="radio-title">{o.title}</span>
                  <span className="radio-sub">{o.sub}</span>
                </span>
                <Badge tone={o.tone} dot={false}>{o.title}</Badge>
              </button>
            ))}
          </div>

          <div className="mt16">
            <label className="input-label">Catatan keputusan</label>
            <textarea className="input" placeholder="Mis. hasil musyawarah RT, alasan penetapan…" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
          </div>

          <div className="row mt12" style={{ gap: 9, fontSize: 12, color: 'var(--muted)' }}>
            <Icon name="bell" style={{ width: 15, height: 15 }} />
            Notifikasi otomatis akan dikirim ke warga setelah status disimpan.
          </div>
        </div>

        <div className="drawer-foot">
          <button className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" style={{ flex: 1 }} disabled={!status}
            onClick={() => onSimpan(row.id, { status, catatan })}>
            <Icon name="check" /> Simpan & Kirim Notifikasi
          </button>
        </div>
      </div>
    </div>
  );
}

export function StatusSeleksi() {
  const [list, setList] = useState([]);
  const [active, setActive] = useState(null);
  const [filter, setFilter] = useState('semua');
  const [open, setOpen] = useState(null);
  const toast = useToast();

  function load() {
    api.get('/api/admin/bantuan/active').then(setActive).catch(() => setActive(null));
    api.get('/api/admin/seleksi').then(setList).catch(() => setList([]));
  }
  useEffect(load, []);

  const terisi = list.filter((r) => r.status === 'penerima').length;
  const overQuota = active && terisi > active.kuota;
  const persen = active ? (terisi / active.kuota) * 100 : 0;
  const filtered = filter === 'semua' ? list : list.filter((r) => r.status === filter);

  async function simpan(id, patch) {
    try {
      await api.put(`/api/admin/seleksi/${id}`, patch);
      toast(`Status berhasil diperbarui → "${STATUS_META[patch.status].label}". Notifikasi terkirim ke warga.`, 'blue');
      setOpen(null);
      load();
    } catch (err) {
      toast(err.message, 'red');
    }
  }

  const tabs = [
    { id: 'semua', label: 'Semua' },
    { id: 'penerima', label: 'Penerima' },
    { id: 'cadangan', label: 'Cadangan' },
    { id: 'menunggu', label: 'Menunggu' },
  ];

  return (
    <div className="content-inner">
      <div className="page-intro">
        <span className="uc-tag"><Icon name="status" /> UC10</span>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Status Penerima Bantuan</h2>
        <p>Warga diurutkan menurut skor prioritas dari Asisten AI. Tetapkan status penerimaan, catat keputusan musyawarah, dan sistem otomatis memberi notifikasi kepada warga.</p>
      </div>

      {active && (
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <div className="spread" style={{ flexWrap: 'wrap', gap: 14 }}>
            <div className="row" style={{ gap: 14 }}>
              <div className="stat-ico" style={{ background: 'var(--green-bg)', color: 'oklch(0.45 0.11 150)', margin: 0 }}><Icon name="shield" /></div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800 }}>Kuota Penerima — {active.periode}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{active.nama_bantuan} · maksimal {active.kuota} penerima</div>
              </div>
            </div>
            <div style={{ minWidth: 220, flex: 1, maxWidth: 320 }}>
              <div className="spread" style={{ marginBottom: 7 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: overQuota ? 'var(--red)' : 'var(--ink-2)' }}>Terisi {terisi} dari {active.kuota}</span>
                {overQuota && <span className="badge red" style={{ fontSize: 11 }}>Melebihi kuota</span>}
              </div>
              <QuotaBar percent={persen} over={overQuota} />
            </div>
          </div>
        </div>
      )}

      <div className="toolbar">
        <div className="seg">
          {tabs.map((t) => (
            <button key={t.id} className={filter === t.id ? 'active' : ''} onClick={() => setFilter(t.id)} type="button">{t.label}</button>
          ))}
        </div>
        <div className="row" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
          <Icon name="sparkle" style={{ width: 15, height: 15, color: 'var(--blue-600)' }} /> Diurutkan menurut prioritas AI
        </div>
      </div>

      <div className="card">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr><th style={{ width: 44 }}>#</th><th>Warga</th><th>Prioritas (AI)</th><th>Validitas</th><th>Status Bantuan</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => (
                <tr key={row.id} onClick={() => setOpen(row)}>
                  <td style={{ color: 'var(--faint)', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{list.indexOf(row) + 1}</td>
                  <td>
                    <div className="person">
                      <Avatar nama={row.nama} id={row.warga_id} />
                      <div><div className="cell-name">{row.nama}</div><div className="cell-meta">{row.nik}</div></div>
                    </div>
                  </td>
                  <td><ScoreChip skor={row.skor_prioritas} /></td>
                  <td><Badge tone={row.validitas === 'valid' ? 'green' : 'amber'}>{row.validitas}</Badge></td>
                  <td><Badge tone={STATUS_META[row.status].tone}>{STATUS_META[row.status].label}</Badge></td>
                  <td className="num">
                    <button className="btn btn-soft btn-sm" onClick={(e) => { e.stopPropagation(); setOpen(row); }} type="button">Tetapkan</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {open && <StatusDrawer row={open} onClose={() => setOpen(null)} onSimpan={simpan} />}
    </div>
  );
}
