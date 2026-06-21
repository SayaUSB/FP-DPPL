/* ============================================================
   F02 / UC02 — Memeriksa Validitas Data Warga
   ============================================================ */

function VerifikasiDrawer({ warga, onClose, onSimpan }) {
  const v = SIB.validitasMeta[warga.validitas];
  const kel = SIB.kelengkapanScore(warga);
  const [status, setStatus] = useState(warga.validitas === 'menunggu' ? '' : warga.validitas);
  const [catatan, setCatatan] = useState(warga.catatan || '');
  const [cek, setCek] = useState({ ...warga.kelengkapan });

  const toggle = (k) => setCek(c => ({ ...c, [k]: !c[k] }));

  const checkItems = [
    { k: 'ktp', label: 'Identitas (KTP) sesuai', sub: 'NIK & nama cocok dengan dokumen' },
    { k: 'kk', label: 'Kartu Keluarga valid', sub: 'No. KK dan jumlah anggota sesuai' },
    { k: 'pendapatan', label: 'Data pendapatan wajar', sub: 'Penghasilan & pekerjaan konsisten' },
    { k: 'foto', label: 'Foto kondisi rumah lengkap', sub: '3 foto terunggah & representatif' },
  ];
  const semuaCek = Object.values(cek).every(Boolean);

  const opsiStatus = [
    { v: 'valid', title: 'Valid', sub: 'Data lengkap & akurat, lolos verifikasi', tone: 'green' },
    { v: 'perlu_perbaikan', title: 'Perlu Perbaikan', sub: 'Ada data yang harus dilengkapi warga', tone: 'amber' },
    { v: 'tidak_valid', title: 'Tidak Valid', sub: 'Data tidak memenuhi syarat verifikasi', tone: 'red' },
  ];

  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-head">
          <Avatar nama={warga.nama} id={warga.id} size={46} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em' }}>{warga.nama}</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
              NIK {warga.nik} · Daftar {new Date(warga.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div className="mt8"><Badge tone={v.tone}>{v.label}</Badge></div>
          </div>
          <button className="iconbtn" onClick={onClose}><Icon name="close" /></button>
        </div>

        <div className="drawer-body">
          {/* Data administratif */}
          <div className="section-title" style={{ marginTop: 0 }}>Data Administratif</div>
          <div className="field-grid">
            <div className="field"><div className="field-label">Pekerjaan</div><div className="field-val">{warga.pekerjaan}</div></div>
            <div className="field"><div className="field-label">Pendapatan / bln</div><div className="field-val">{SIB.fmtRupiah(warga.pendapatan)}</div></div>
            <div className="field"><div className="field-label">Tanggungan</div><div className="field-val">{warga.tanggungan} orang</div></div>
            <div className="field"><div className="field-label">No. KK</div><div className="field-val" style={{ fontVariantNumeric: 'tabular-nums' }}>{warga.noKK}</div></div>
            <div className="field"><div className="field-label">Status Rumah</div><div className="field-val">{warga.statusRumah}</div></div>
            <div className="field"><div className="field-label">Kondisi Rumah</div><div className="field-val">{warga.kondisiRumah}</div></div>
            <div className="field full"><div className="field-label">Alamat</div><div className="field-val" style={{ fontSize: 13.5 }}>{warga.alamat}</div></div>
          </div>

          {/* Foto kondisi rumah */}
          <div className="section-title">Foto Kondisi Rumah</div>
          <div className="photo-grid">
            <PhotoSlot tag="Eksterior" caption="foto_depan.jpg" />
            <PhotoSlot tag="Interior" caption="foto_dalam.jpg" />
            <PhotoSlot tag="Lingkungan" caption="foto_sekitar.jpg" />
          </div>

          {/* Checklist kelengkapan */}
          <div className="spread" style={{ margin: '22px 0 11px' }}>
            <div className="section-title" style={{ margin: 0 }}>Pemeriksaan Kelengkapan</div>
            <Badge tone={semuaCek ? 'green' : 'amber'} dot={false}>{Object.values(cek).filter(Boolean).length}/{checkItems.length} terpenuhi</Badge>
          </div>
          <div className="checklist">
            {checkItems.map(it => (
              <button key={it.k} className={'check-item' + (cek[it.k] ? '' : ' bad')} onClick={() => toggle(it.k)}>
                <span className={'check-box ' + (cek[it.k] ? 'on' : 'off')}>
                  {cek[it.k] && <Icon name="check" />}
                </span>
                <span style={{ textAlign: 'left' }}>
                  <span className="check-text" style={{ display: 'block' }}>{it.label}</span>
                  <span className="check-sub">{it.sub}</span>
                </span>
              </button>
            ))}
          </div>

          {/* Tetapkan status validitas */}
          <div className="section-title">Tetapkan Status Validitas</div>
          <div className="radio-cards">
            {opsiStatus.map(o => (
              <button key={o.v} className={'radio-card' + (status === o.v ? ' sel' : '')} onClick={() => setStatus(o.v)}>
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
            <textarea className="input" placeholder="Tulis catatan untuk warga / arsip RT…"
              value={catatan} onChange={e => setCatatan(e.target.value)} />
          </div>
        </div>

        <div className="drawer-foot">
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: '0 0 auto' }}>Batal</button>
          <button className="btn btn-primary" style={{ flex: 1 }} disabled={!status}
            onClick={() => onSimpan(warga.id, { validitas: status, catatan, kelengkapan: cek })}>
            <Icon name="check" /> Simpan Hasil Verifikasi
          </button>
        </div>
      </div>
    </div>
  );
}

function Verifikasi({ data, setData, toast }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('semua');
  const [open, setOpen] = useState(null);
  const [showInfo, setShowInfo] = useState(true);
  
  useEffect(() => {
    setShowInfo(true);
  }, []);

  const counts = useMemo(() => {
    const c = { semua: data.length, menunggu: 0, valid: 0, perlu_perbaikan: 0 };
    data.forEach(w => { if (c[w.validitas] !== undefined) c[w.validitas]++; });
    return c;
  }, [data]);

  const filtered = data.filter(w => {
    const okF = filter === 'semua' || w.validitas === filter || (filter === 'perlu_perbaikan' && w.validitas === 'tidak_valid');
    const okQ = w.nama.toLowerCase().includes(q.toLowerCase()) || w.nik.includes(q);
    return okF && okQ;
  });

  const simpan = (id, patch) => {
    setData(d => d.map(w => w.id === id ? { ...w, ...patch } : w));
    setOpen(null);
    const meta = SIB.validitasMeta[patch.validitas];
    toast(`Verifikasi disimpan — status data ditetapkan "${meta.label}".`, 'green');
  };

  const tabs = [
    { id: 'semua', label: 'Semua', n: counts.semua },
    { id: 'menunggu', label: 'Menunggu', n: counts.menunggu },
    { id: 'valid', label: 'Valid', n: counts.valid },
    { id: 'perlu_perbaikan', label: 'Perlu Perbaikan', n: counts.perlu_perbaikan },
  ];

  return (
    <div className="content-inner">
      {showInfo && (
        <InfoModal
          title="Verifikasi Validitas Data Warga"
          desc="Periksa kelengkapan dan keakuratan data setiap warga secara detail. Tinjau foto kondisi rumah, gunakan checklist verifikasi, lalu tetapkan status untuk memastikan data berkualitas sebelum seleksi."
          items={[
            { label: '📋 Daftar Warga', text: 'Tampil semua warga dengan filter berdasarkan status validitas (Semua, Menunggu, Valid, Perlu Perbaikan). Gunakan kotak pencarian untuk cari nama atau NIK.' },
            { label: '🔍 Periksa Detail', text: 'Klik tombol "Periksa" untuk membuka drawer dengan data lengkap: identitas, pekerjaan, pendapatan, tanggungan, status & kondisi rumah, serta 3 foto (Eksterior, Interior, Lingkungan).' },
            { label: '✓ Checklist Kelengkapan', text: 'Verifikasi 4 dokumen: KTP sesuai, KK valid, data pendapatan wajar, foto rumah lengkap. Centang setiap item yang sudah diperiksa.' },
            { label: '📌 Tetapkan Status', text: 'Pilih salah satu: Valid (data lengkap & akurat) → Perlu Perbaikan (ada yang harus diperbaiki warga) → Tidak Valid (tidak memenuhi syarat). Tambahkan catatan untuk warga.' },
          ]}
          onClose={() => setShowInfo(false)}
        />
      )}
      <div className="page-intro">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span className="uc-tag"><Icon name="verify" /> F02 · UC02</span>
          <button className="btn btn-ghost btn-sm no-print" onClick={() => setShowInfo(true)} title="Buka penjelasan">
            <Icon name="sparkle" /> Info
          </button>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Verifikasi Validitas Data Warga</h2>
        <p>Periksa kelengkapan dan keakuratan data tiap warga, tinjau foto kondisi rumah, lalu tetapkan status validitas sebelum data digunakan untuk seleksi penerima bantuan.</p>
      </div>

      <div className="toolbar">
        <div className="seg">
          {tabs.map(t => (
            <button key={t.id} className={filter === t.id ? 'active' : ''} onClick={() => setFilter(t.id)}>
              {t.label} <span style={{ opacity: 0.7 }}>· {t.n}</span>
            </button>
          ))}
        </div>
        <div className="search" style={{ marginLeft: 'auto' }}>
          <Icon name="search" />
          <input placeholder="Cari nama atau NIK…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Warga</th>
                <th>Pekerjaan & Pendapatan</th>
                <th>Kelengkapan</th>
                <th>Status Validitas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(w => {
                const v = SIB.validitasMeta[w.validitas];
                const kel = SIB.kelengkapanScore(w);
                return (
                  <tr key={w.id} onClick={() => setOpen(w)}>
                    <td>
                      <div className="person">
                        <Avatar nama={w.nama} id={w.id} />
                        <div>
                          <div className="cell-name">{w.nama}</div>
                          <div className="cell-meta">{w.alamat}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{w.pekerjaan}</div>
                      <div className="cell-meta">{SIB.fmtRupiah(w.pendapatan)}/bln · {w.tanggungan} tanggungan</div>
                    </td>
                    <td>
                      <Badge tone={kel.ok === kel.total ? 'green' : 'amber'} dot={false}>{kel.ok}/{kel.total} dokumen</Badge>
                    </td>
                    <td><Badge tone={v.tone}>{v.label}</Badge></td>
                    <td className="num">
                      <button className="btn btn-soft btn-sm" onClick={(e) => { e.stopPropagation(); setOpen(w); }}>
                        Periksa
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="empty"><Icon name="search" /><div>Tidak ada warga yang cocok dengan filter.</div></div>
        )}
      </div>

      {open && <VerifikasiDrawer warga={open} onClose={() => setOpen(null)} onSimpan={simpan} />}
    </div>
  );
}

Object.assign(window, { Verifikasi });
