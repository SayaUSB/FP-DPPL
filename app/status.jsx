/* ============================================================
   F10 / UC10 — Memperbarui Status Penerimaan Bantuan
   ============================================================ */

function AIPanel({ warga }) {
  const { faktor } = SIB.faktorPrioritas(warga);
  const rek = SIB.rekomendasiAI(warga);
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
      <div className="ai-rec" dangerouslySetInnerHTML={{ __html: rek.teks.replace(rek.skor + '/100', '<b>' + rek.skor + '/100</b>') }} />
      <div className="factor-list">
        {faktor.map((f, i) => (
          <div className="factor" key={i}>
            <div className="factor-top">
              <span className="fn">{f.nama} <span style={{ color: 'var(--faint)' }}>· {f.ket}</span></span>
              <span className="fv">{f.nilai.toFixed(0)}<span style={{ color: 'var(--faint)', fontWeight: 600 }}>/{f.max}</span></span>
            </div>
            <div className="factor-track"><span style={{ width: (f.nilai / f.max * 100) + '%' }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusDrawer({ warga, onClose, onSimpan }) {
  const cur = SIB.statusMeta[warga.statusBantuan];
  const [status, setStatus] = useState(warga.statusBantuan);
  const [catatan, setCatatan] = useState(warga.catatan || '');
  const validBlocked = warga.validitas !== 'valid';

  const opsi = [
    { v: 'penerima', title: 'Penerima Bantuan', sub: 'Ditetapkan menerima bantuan periode ini', tone: 'green' },
    { v: 'cadangan', title: 'Daftar Cadangan', sub: 'Menerima jika ada kuota tambahan', tone: 'blue' },
    { v: 'bukan', title: 'Bukan Penerima', sub: 'Belum memenuhi kriteria periode ini', tone: 'gray' },
  ];

  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-head">
          <Avatar nama={warga.nama} id={warga.id} size={46} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em' }}>{warga.nama}</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{warga.pekerjaan} · {SIB.fmtRupiah(warga.pendapatan)}/bln · {warga.tanggungan} tanggungan</div>
            <div className="mt8 row" style={{ gap: 7 }}>
              <Badge tone={SIB.validitasMeta[warga.validitas].tone}>{SIB.validitasMeta[warga.validitas].label}</Badge>
              <Badge tone={cur.tone}>{cur.label}</Badge>
            </div>
          </div>
          <button className="iconbtn" onClick={onClose}><Icon name="close" /></button>
        </div>

        <div className="drawer-body">
          <AIPanel warga={warga} />

          {validBlocked && (
            <div className="card-pad" style={{ background: 'var(--amber-bg)', border: '1px solid color-mix(in oklch, var(--amber) 35%, white)', borderRadius: 'var(--radius)', marginTop: 16, display: 'flex', gap: 11, alignItems: 'flex-start' }}>
              <Icon name="alert" className="" />
              <div style={{ fontSize: 12.5, color: 'oklch(0.42 0.09 60)', fontWeight: 600 }}>
                Data warga ini belum berstatus <b>Valid</b>. Sebaiknya selesaikan verifikasi (F02) sebelum menetapkannya sebagai penerima.
              </div>
            </div>
          )}

          <div className="section-title">Tetapkan Status Penerimaan</div>
          <div className="radio-cards">
            {opsi.map(o => (
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
            <label className="input-label">Catatan keputusan</label>
            <textarea className="input" placeholder="Mis. hasil musyawarah RT, alasan penetapan…"
              value={catatan} onChange={e => setCatatan(e.target.value)} />
          </div>

          <div className="row mt12" style={{ gap: 9, fontSize: 12, color: 'var(--muted)' }}>
            <Icon name="bell" style={{ width: 15, height: 15 }} />
            Notifikasi otomatis akan dikirim ke warga setelah status disimpan.
          </div>
        </div>

        <div className="drawer-foot">
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: '0 0 auto' }}>Batal</button>
          <button className="btn btn-primary" style={{ flex: 1 }}
            onClick={() => onSimpan(warga.id, { statusBantuan: status, catatan })}>
            <Icon name="check" /> Simpan & Kirim Notifikasi
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusPenerima({ data, setData, toast }) {
  const [open, setOpen] = useState(null);
  const [filter, setFilter] = useState('semua');
  const [showInfo, setShowInfo] = useState(true);
  
  useEffect(() => {
    setShowInfo(true);
  }, []);
  
  const K = SIB.KONFIG;

  // urutkan menurut skor prioritas (rekomendasi AI)
  const ranked = useMemo(() => {
    return [...data]
      .map(w => ({ ...w, _skor: SIB.skorPrioritas(w) }))
      .sort((a, b) => b._skor - a._skor);
  }, [data]);

  const penerima = data.filter(w => w.statusBantuan === 'penerima').length;
  const kuotaPersen = Math.min(100, penerima / K.kuota * 100);
  const overQuota = penerima > K.kuota;

  const filtered = ranked.filter(w => filter === 'semua' || w.statusBantuan === filter);

  const simpan = (id, patch) => {
    setData(d => d.map(w => w.id === id ? { ...w, ...patch } : w));
    const w = data.find(x => x.id === id);
    const meta = SIB.statusMeta[patch.statusBantuan];
    setOpen(null);
    toast(`Status ${w.nama} → "${meta.label}". Notifikasi terkirim ke warga.`, 'blue');
  };

  const tabs = [
    { id: 'semua', label: 'Semua' },
    { id: 'penerima', label: 'Penerima' },
    { id: 'cadangan', label: 'Cadangan' },
    { id: 'menunggu', label: 'Menunggu' },
  ];

  return (
    <div className="content-inner">
      {showInfo && (
        <InfoModal
          title="Perbarui Status Penerimaan Bantuan"
          desc="Tetapkan status penerimaan untuk setiap warga berdasarkan rekomendasi Asisten AI dan keputusan musyawarah. Warga otomatis mendapat notifikasi setelah status disimpan."
          items={[
            { label: '🎯 Urutan Prioritas', text: 'Warga diurutkan dari skor prioritas tertinggi ke terendah. Lihat skor dan garis progress di kolom "Prioritas (AI)" — warna merah = sangat tinggi, amber = tinggi, biru = sedang, abu = rendah.' },
            { label: '🤖 Panel Asisten AI', text: 'Setiap warga punya rekomendasi naratif: skor 0–100, kategori prioritas, dan penjelasan faktor (pendapatan per kapita, tanggungan, kondisi rumah, dll) dengan break-down poin.' },
            { label: '⚠️ Validitas Penting', text: 'Jika data warga status "Menunggu" atau "Perlu Perbaikan", ada peringatan kuning. Selesaikan verifikasi (F02) terlebih dahulu agar data berkualitas.' },
            { label: '✅ Status Penerimaan', text: 'Pilih: Penerima (daftar utama) → Daftar Cadangan (jika kuota terpenuhi) → Bukan Penerima (tidak memenuhi kriteria). Catat keputusan musyawarah, lalu simpan—warga langsung notif.' },
          ]}
          onClose={() => setShowInfo(false)}
        />
      )}
      <div className="page-intro">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span className="uc-tag"><Icon name="status" /> F10 · UC10</span>
          <button className="btn btn-ghost btn-sm no-print" onClick={() => setShowInfo(true)} title="Buka penjelasan">
            <Icon name="sparkle" /> Info
          </button>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Perbarui Status Penerimaan Bantuan</h2>
        <p>Warga diurutkan menurut skor prioritas dari Asisten AI. Tetapkan status penerimaan, catat keputusan musyawarah, dan sistem otomatis memberi notifikasi kepada warga.</p>
      </div>

      {/* Kuota banner */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="spread" style={{ flexWrap: 'wrap', gap: 14 }}>
          <div className="row" style={{ gap: 14 }}>
            <div className="stat-ico" style={{ background: 'var(--green-bg)', color: 'oklch(0.45 0.11 150)', margin: 0 }}><Icon name="shield" /></div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>Kuota Penerima — {K.periode.split('—')[1]?.trim() || K.periode}</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{K.rt} · maksimal {K.kuota} penerima · {SIB.fmtRupiah(K.nominal)}/KK</div>
            </div>
          </div>
          <div style={{ minWidth: 220, flex: 1, maxWidth: 320 }}>
            <div className="spread" style={{ marginBottom: 7 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: overQuota ? 'var(--red)' : 'var(--ink-2)' }}>Terisi {penerima} dari {K.kuota}</span>
              {overQuota && <span className="badge red" style={{ fontSize: 11 }}>Melebihi kuota</span>}
            </div>
            <div className="quota-bar">
              <span style={{ width: kuotaPersen + '%', background: overQuota ? 'var(--red)' : 'var(--green)' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="seg">
          {tabs.map(t => (
            <button key={t.id} className={filter === t.id ? 'active' : ''} onClick={() => setFilter(t.id)}>{t.label}</button>
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
              <tr>
                <th style={{ width: 44 }}>#</th>
                <th>Warga</th>
                <th>Prioritas (AI)</th>
                <th>Validitas</th>
                <th>Status Bantuan</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w, idx) => {
                const rank = ranked.findIndex(r => r.id === w.id) + 1;
                const st = SIB.statusMeta[w.statusBantuan];
                const vv = SIB.validitasMeta[w.validitas];
                return (
                  <tr key={w.id} onClick={() => setOpen(w)}>
                    <td style={{ color: 'var(--faint)', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{rank}</td>
                    <td>
                      <div className="person">
                        <Avatar nama={w.nama} id={w.id} />
                        <div>
                          <div className="cell-name">{w.nama}</div>
                          <div className="cell-meta">{w.pekerjaan} · {w.tanggungan} tanggungan</div>
                        </div>
                      </div>
                    </td>
                    <td><ScoreChip skor={w._skor} /></td>
                    <td><Badge tone={vv.tone}>{vv.label}</Badge></td>
                    <td><Badge tone={st.tone}>{st.label}</Badge></td>
                    <td className="num">
                      <button className="btn btn-soft btn-sm" onClick={(e) => { e.stopPropagation(); setOpen(w); }}>Tetapkan</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {open && <StatusDrawer warga={open} onClose={() => setOpen(null)} onSimpan={simpan} />}
    </div>
  );
}

Object.assign(window, { StatusPenerima, AIPanel });
