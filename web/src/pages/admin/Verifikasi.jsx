import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { Avatar, Badge, Icon, useToast } from '../../components/ui';

const VALIDITAS_META = {
  valid: { label: 'Valid', tone: 'green' },
  menunggu: { label: 'Menunggu', tone: 'amber' },
  perlu_perbaikan: { label: 'Perlu Perbaikan', tone: 'red' },
  tidak_valid: { label: 'Tidak Valid', tone: 'red' },
};

const CHECK_ITEMS = [
  { k: 'chk_ktp', label: 'Identitas (KTP) sesuai', sub: 'NIK & nama cocok dengan dokumen' },
  { k: 'chk_kk', label: 'Kartu Keluarga valid', sub: 'No. KK dan jumlah anggota sesuai' },
  { k: 'chk_pendapatan', label: 'Data pendapatan wajar', sub: 'Penghasilan & pekerjaan konsisten' },
  { k: 'chk_foto', label: 'Foto kondisi rumah lengkap', sub: '3 foto terunggah & representatif' },
];

const OPSI_STATUS = [
  { v: 'valid', title: 'Valid', sub: 'Data lengkap & akurat, lolos verifikasi', tone: 'green' },
  { v: 'perlu_perbaikan', title: 'Perlu Perbaikan', sub: 'Ada data yang harus dilengkapi warga', tone: 'amber' },
  { v: 'tidak_valid', title: 'Tidak Valid', sub: 'Data tidak memenuhi syarat verifikasi', tone: 'red' },
];

function VerifikasiDrawer({ warga, onClose, onSimpan }) {
  const [status, setStatus] = useState(warga.validitas === 'menunggu' ? '' : warga.validitas);
  const [catatan, setCatatan] = useState(warga.catatan_verifikasi || '');
  const [cek, setCek] = useState({
    chk_ktp: warga.chk_ktp, chk_kk: warga.chk_kk, chk_pendapatan: warga.chk_pendapatan, chk_foto: warga.chk_foto,
  });
  const v = VALIDITAS_META[warga.validitas];
  const semuaCek = Object.values(cek).every(Boolean);
  const toggle = (k) => setCek((c) => ({ ...c, [k]: !c[k] }));

  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <Avatar nama={warga.nama} id={warga.id} size={46} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em' }}>{warga.nama}</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>NIK {warga.nik}</div>
            <div className="mt8"><Badge tone={v.tone}>{v.label}</Badge></div>
          </div>
          <button className="iconbtn" onClick={onClose}><Icon name="close" /></button>
        </div>

        <div className="drawer-body">
          <div className="section-title" style={{ marginTop: 0 }}>Data Administratif</div>
          <div className="field-grid">
            <div className="field"><div className="field-label">Pekerjaan</div><div className="field-val">{warga.pekerjaan || '-'}</div></div>
            <div className="field"><div className="field-label">Pendapatan / bln</div><div className="field-val">Rp {Number(warga.pendapatan || 0).toLocaleString('id-ID')}</div></div>
            <div className="field"><div className="field-label">Tanggungan</div><div className="field-val">{warga.tanggungan ?? '-'} orang</div></div>
            <div className="field"><div className="field-label">No. KK</div><div className="field-val">{warga.no_kk || '-'}</div></div>
            <div className="field"><div className="field-label">Status Rumah</div><div className="field-val">{warga.status_rumah || '-'}</div></div>
            <div className="field"><div className="field-label">Kondisi Rumah</div><div className="field-val">{warga.kondisi_rumah || '-'}</div></div>
            <div className="field full"><div className="field-label">Alamat</div><div className="field-val" style={{ fontSize: 13.5 }}>{warga.alamat || '-'}</div></div>
          </div>

          {warga.ai_kondisi_saran && (
            <div className="mt12" style={{ background: 'var(--blue-50)', border: '1px solid var(--blue-100)', borderRadius: 'var(--radius)', padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Icon name="sparkle" style={{ color: 'var(--blue-600)', marginTop: 1 }} />
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>
                <strong>Saran Asisten AI (VLM):</strong> {warga.ai_kondisi_saran}
                {warga.ai_kondisi_alasan && <> — <em>"{warga.ai_kondisi_alasan}"</em></>}
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                  Saran otomatis dari foto, bukan keputusan resmi. Kondisi Rumah di atas tetap nilai yang dipilih warga/RT.
                </div>
              </div>
            </div>
          )}

          <div className="section-title">Foto Kondisi Rumah</div>
          <div className="photo-grid">
            {['eksterior', 'interior', 'lingkungan'].map((jenis) => {
              const foto = warga.foto.find((f) => f.jenis === jenis);
              return (
                <div className="photo" key={jenis}>
                  <span className="photo-tag">{jenis[0].toUpperCase() + jenis.slice(1)}</span>
                  {foto
                    ? <img src={`/uploads/${foto.file_path}`} alt={jenis} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <><Icon name="image" /><span className="photo-cap">Belum diunggah</span></>}
                </div>
              );
            })}
          </div>

          <div className="spread" style={{ margin: '22px 0 11px' }}>
            <div className="section-title" style={{ margin: 0 }}>Pemeriksaan Kelengkapan</div>
            <Badge tone={semuaCek ? 'green' : 'amber'} dot={false}>{Object.values(cek).filter(Boolean).length}/{CHECK_ITEMS.length} terpenuhi</Badge>
          </div>
          <div className="checklist">
            {CHECK_ITEMS.map((it) => (
              <button key={it.k} className={'check-item' + (cek[it.k] ? '' : ' bad')} onClick={() => toggle(it.k)} type="button">
                <span className={'check-box ' + (cek[it.k] ? 'on' : 'off')}>{cek[it.k] && <Icon name="check" />}</span>
                <span style={{ textAlign: 'left' }}>
                  <span className="check-text" style={{ display: 'block' }}>{it.label}</span>
                  <span className="check-sub">{it.sub}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="section-title">Tetapkan Status Validitas</div>
          <div className="radio-cards">
            {OPSI_STATUS.map((o) => (
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
            <label className="input-label">Catatan verifikasi {status === 'valid' ? '(opsional)' : '(disarankan)'}</label>
            <textarea className="input" placeholder="Tulis catatan untuk warga / arsip RT…" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
          </div>
        </div>

        <div className="drawer-foot">
          <button className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" style={{ flex: 1 }} disabled={!status}
            onClick={() => onSimpan(warga.id, { validitas: status, catatan_verifikasi: catatan, ...cek })}>
            <Icon name="check" /> Simpan Hasil Verifikasi
          </button>
        </div>
      </div>
    </div>
  );
}

export function Verifikasi() {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(null);
  const toast = useToast();

  function load() {
    const params = new URLSearchParams();
    if (filter) params.set('validitas', filter);
    if (search) params.set('search', search);
    api.get(`/api/admin/warga?${params}`).then(setList);
  }
  useEffect(load, [filter, search]);

  const counts = useMemo(() => {
    const c = { '': list.length, menunggu: 0, valid: 0, perlu_perbaikan: 0 };
    list.forEach((w) => { if (c[w.validitas] !== undefined) c[w.validitas]++; });
    return c;
  }, [list]);

  const tabs = [
    { id: '', label: 'Semua' },
    { id: 'menunggu', label: 'Menunggu' },
    { id: 'valid', label: 'Valid' },
    { id: 'perlu_perbaikan', label: 'Perlu Perbaikan' },
  ];

  async function openDetail(id) {
    const detail = await api.get(`/api/admin/warga/${id}`);
    setOpen(detail);
  }

  async function simpan(id, patch) {
    try {
      await api.put(`/api/admin/warga/${id}/validitas`, patch);
      toast(`Verifikasi disimpan — status data ditetapkan "${VALIDITAS_META[patch.validitas].label}".`, 'green');
      setOpen(null);
      load();
    } catch (err) {
      toast(err.message, 'red');
    }
  }

  return (
    <div className="content-inner">
      <div className="page-intro">
        <span className="uc-tag"><Icon name="verify" /> UC02</span>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Verifikasi Validitas Data Warga</h2>
        <p>Periksa kelengkapan dan keakuratan data tiap warga, tinjau foto kondisi rumah, lalu tetapkan status validitas sebelum data digunakan untuk seleksi penerima bantuan.</p>
      </div>

      <div className="toolbar">
        <div className="seg">
          {tabs.map((t) => (
            <button key={t.id} className={filter === t.id ? 'active' : ''} onClick={() => setFilter(t.id)} type="button">
              {t.label} <span style={{ opacity: 0.7 }}>· {counts[t.id] || 0}</span>
            </button>
          ))}
        </div>
        <div className="search" style={{ marginLeft: 'auto' }}>
          <Icon name="search" />
          <input placeholder="Cari nama atau NIK…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Warga</th><th>Pekerjaan & Pendapatan</th><th>Kelengkapan</th><th>Status Validitas</th><th></th></tr>
            </thead>
            <tbody>
              {list.map((w) => {
                const v = VALIDITAS_META[w.validitas];
                const cekTotal = [w.chk_ktp, w.chk_kk, w.chk_pendapatan, w.chk_foto];
                const ok = cekTotal.filter(Boolean).length;
                return (
                  <tr key={w.id} onClick={() => openDetail(w.id)}>
                    <td>
                      <div className="person">
                        <Avatar nama={w.nama} id={w.id} />
                        <div>
                          <div className="cell-name">{w.nama}</div>
                          <div className="cell-meta">{w.alamat || w.nik}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{w.pekerjaan || '-'}</div>
                      <div className="cell-meta">Rp {Number(w.pendapatan || 0).toLocaleString('id-ID')}/bln · {w.tanggungan ?? 0} tanggungan</div>
                    </td>
                    <td><Badge tone={ok === 4 ? 'green' : 'amber'} dot={false}>{ok}/4 dokumen</Badge></td>
                    <td><Badge tone={v.tone}>{v.label}</Badge></td>
                    <td className="num">
                      <button className="btn btn-soft btn-sm" onClick={(e) => { e.stopPropagation(); openDetail(w.id); }} type="button">Periksa</button>{' '}
                      <Link className="btn btn-ghost btn-sm" to={`/admin/warga/${w.id}/ubah`} onClick={(e) => e.stopPropagation()}>Ubah</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {list.length === 0 && (
          <div className="empty"><Icon name="search" /><div>Tidak ada warga yang cocok dengan filter.</div></div>
        )}
      </div>

      {open && <VerifikasiDrawer warga={open} onClose={() => setOpen(null)} onSimpan={simpan} />}
    </div>
  );
}
