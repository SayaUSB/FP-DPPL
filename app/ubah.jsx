/* ============================================================
   F05 / UC05 — Mengubah Data Warga
   ============================================================ */

function UbahForm({ warga, onClose, onSimpan }) {
  const [form, setForm] = useState({
    nama: warga.nama,
    alamat: warga.alamat,
    pekerjaan: warga.pekerjaan,
    kategoriKerja: warga.kategoriKerja,
    pendapatan: warga.pendapatan,
    tanggungan: warga.tanggungan,
    statusRumah: warga.statusRumah,
    kondisiRumah: warga.kondisiRumah,
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setTouched(t => ({ ...t, [k]: true }));
  };

  // Live preview skor dengan data baru
  const preview = SIB.skorPrioritas({ ...warga, ...form,
    pendapatan: Number(form.pendapatan) || 0,
    tanggungan: Number(form.tanggungan) || 0,
  });
  const previewT = SIB.tingkatPrioritas(preview);
  const skorLama = SIB.skorPrioritas(warga);
  const delta = preview - skorLama;

  const validate = () => {
    const e = {};
    if (!form.nama.trim()) e.nama = 'Nama tidak boleh kosong';
    if (!form.alamat.trim()) e.alamat = 'Alamat tidak boleh kosong';
    if (!form.pekerjaan.trim()) e.pekerjaan = 'Pekerjaan tidak boleh kosong';
    const pend = Number(form.pendapatan);
    if (!pend || pend < 0) e.pendapatan = 'Pendapatan harus berupa angka positif';
    const tang = Number(form.tanggungan);
    if (tang < 0 || tang > 15) e.tanggungan = 'Tanggungan 0–15';
    return e;
  };

  const handleSimpan = () => {
    const e = validate();
    setErrors(e);
    setTouched({ nama: true, alamat: true, pekerjaan: true, pendapatan: true, tanggungan: true });
    if (Object.keys(e).length) return;
    onSimpan(warga.id, {
      ...form,
      pendapatan: Number(form.pendapatan),
      tanggungan: Number(form.tanggungan),
      // reset validitas karena data berubah
      validitas: 'menunggu',
      catatan: '',
    });
  };

  const fld = (k, label, node) => (
    <div key={k}>
      <label className="input-label">{label}</label>
      {node}
      {touched[k] && errors[k] && (
        <div style={{ fontSize: 11.5, color: 'var(--red)', marginTop: 4 }}>{errors[k]}</div>
      )}
    </div>
  );

  const changed = JSON.stringify({ ...form, pendapatan: Number(form.pendapatan), tanggungan: Number(form.tanggungan) }) !==
    JSON.stringify({ nama: warga.nama, alamat: warga.alamat, pekerjaan: warga.pekerjaan, kategoriKerja: warga.kategoriKerja, pendapatan: warga.pendapatan, tanggungan: warga.tanggungan, statusRumah: warga.statusRumah, kondisiRumah: warga.kondisiRumah });

  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>

        <div className="drawer-head">
          <Avatar nama={warga.nama} id={warga.id} size={46} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Ubah Data — {warga.nama}</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>NIK {warga.nik}</div>
            <div className="mt8 row" style={{ gap: 7 }}>
              <Badge tone={SIB.validitasMeta[warga.validitas].tone}>{SIB.validitasMeta[warga.validitas].label}</Badge>
              {changed && <Badge tone="amber" dot={false}>Ada perubahan</Badge>}
            </div>
          </div>
          <button className="iconbtn" onClick={onClose}><Icon name="close" /></button>
        </div>

        <div className="drawer-body">

          {/* Pratinjau skor prioritas baru */}
          <div className="ai-panel" style={{ marginBottom: 20 }}>
            <div className="ai-head">
              <div className="ai-spark"><Icon name="sparkle" /></div>
              <div className="ai-title">
                Pratinjau Skor Prioritas
                <small>Diperbarui otomatis saat data berubah</small>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Skor Lama</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--faint)', lineHeight: 1.1 }}>{skorLama}</div>
              </div>
              <div style={{ fontSize: 22, color: 'var(--faint)' }}>→</div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Skor Baru</div>
                <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1, color: {red:'var(--red)',amber:'var(--amber)',blue:'var(--blue-600)',gray:'var(--faint)'}[previewT.tone] }}>{preview}</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <Badge tone={previewT.tone} dot={false}>{previewT.label}</Badge>
                {delta !== 0 && (
                  <div style={{ fontSize: 12, fontWeight: 700, marginTop: 5, color: delta > 0 ? 'var(--red)' : 'var(--green)' }}>
                    {delta > 0 ? '▲' : '▼'} {Math.abs(delta)} poin
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form fields */}
          <div className="section-title" style={{ marginTop: 0 }}>Data Identitas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {fld('nama', 'Nama Kepala Keluarga',
              <input className="input" value={form.nama} onChange={e => set('nama', e.target.value)}
                placeholder="Nama lengkap KK" />
            )}
            {fld('alamat', 'Alamat',
              <input className="input" value={form.alamat} onChange={e => set('alamat', e.target.value)}
                placeholder="Jl. ... No. ..." />
            )}
          </div>

          <div className="section-title">Data Ekonomi</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {fld('pekerjaan', 'Pekerjaan',
              <input className="input" value={form.pekerjaan} onChange={e => set('pekerjaan', e.target.value)}
                placeholder="Jenis pekerjaan" />
            )}
            {fld('kategoriKerja', 'Kategori Stabilitas Kerja',
              <select className="input" value={form.kategoriKerja} onChange={e => set('kategoriKerja', e.target.value)}>
                <option value="tetap">Tetap (PNS, Karyawan Tetap)</option>
                <option value="serabutan">Serabutan / Tidak Tetap</option>
                <option value="tidak_bekerja">Tidak Bekerja</option>
              </select>
            )}
            {fld('pendapatan', 'Pendapatan Keluarga / Bulan (Rp)',
              <input className="input" type="number" min="0" step="50000"
                value={form.pendapatan} onChange={e => set('pendapatan', e.target.value)}
                placeholder="950000" />
            )}
            {fld('tanggungan', 'Jumlah Tanggungan (jiwa)',
              <input className="input" type="number" min="0" max="15"
                value={form.tanggungan} onChange={e => set('tanggungan', e.target.value)}
                placeholder="4" />
            )}
          </div>

          <div className="section-title">Kondisi Tempat Tinggal</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {fld('statusRumah', 'Status Kepemilikan',
              <select className="input" value={form.statusRumah} onChange={e => set('statusRumah', e.target.value)}>
                <option value="Milik Sendiri">Milik Sendiri</option>
                <option value="Kontrak">Kontrak / Sewa</option>
                <option value="Menumpang">Menumpang</option>
              </select>
            )}
            {fld('kondisiRumah', 'Kondisi Fisik Rumah',
              <select className="input" value={form.kondisiRumah} onChange={e => set('kondisiRumah', e.target.value)}>
                <option value="Layak">Layak Huni</option>
                <option value="Kurang Layak">Kurang Layak</option>
                <option value="Tidak Layak">Tidak Layak Huni</option>
              </select>
            )}
          </div>

          {changed && (
            <div style={{ background: 'var(--amber-bg)', border: '1px solid color-mix(in oklch, var(--amber) 30%, white)', borderRadius: 'var(--radius)', padding: '12px 14px', marginTop: 16, fontSize: 12.5, color: 'oklch(0.42 0.09 60)', fontWeight: 600 }}>
              <Icon name="alert" style={{ width: 14, height: 14, display: 'inline', marginRight: 6 }} />
              Menyimpan perubahan akan <b>me-reset status validitas</b> warga ini ke "Menunggu" dan perlu diverifikasi ulang (F02).
            </div>
          )}
        </div>

        <div className="drawer-foot">
          <button className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" style={{ flex: 1 }} disabled={!changed} onClick={handleSimpan}>
            <Icon name="check" /> Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  );
}

function UbahDataWarga({ data, setData, toast }) {
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState('');
  const [showInfo, setShowInfo] = useState(true);

  useEffect(() => { setShowInfo(true); }, []);

  const filtered = data.filter(w =>
    w.nama.toLowerCase().includes(q.toLowerCase()) || w.nik.includes(q)
  );

  const simpan = (id, patch) => {
    setData(d => d.map(w => w.id === id ? { ...w, ...patch } : w));
    const w = data.find(x => x.id === id);
    setOpen(null);
    toast(`Data ${w.nama} berhasil diperbarui. Status validitas direset ke "Menunggu".`, 'green');
  };

  return (
    <div className="content-inner">
      {showInfo && (
        <InfoModal
          title="Ubah Data Warga"
          desc="Perbarui data warga bila terjadi perubahan kondisi ekonomi, tempat tinggal, atau informasi identitas. Setiap perubahan akan mereset status validitas dan memperbarui skor prioritas otomatis."
          items={[
            { label: '✏️ Cari & Pilih Warga', text: 'Gunakan kotak pencarian untuk cari nama atau NIK, lalu klik tombol "Ubah" pada baris warga yang datanya perlu diperbarui.' },
            { label: '📋 Form Perubahan Data', text: 'Edit identitas, alamat, pekerjaan, kategori kerja, pendapatan, tanggungan, status kepemilikan, dan kondisi fisik rumah.' },
            { label: '🎯 Pratinjau Skor Prioritas', text: 'Skor prioritas AI diperbarui secara real-time saat Anda mengisi form. Anda bisa melihat selisih skor lama vs baru sebelum menyimpan.' },
            { label: '⚠️ Reset Validitas Otomatis', text: 'Setelah data disimpan, status validitas warga otomatis kembali ke "Menunggu". Pengurus RT perlu memeriksa ulang data via halaman Verifikasi (F02).' },
          ]}
          onClose={() => setShowInfo(false)}
        />
      )}

      <div className="page-intro">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span className="uc-tag"><Icon name="edit" /> F05 · UC05</span>
          <button className="btn btn-ghost btn-sm no-print" onClick={() => setShowInfo(true)}>
            <Icon name="sparkle" /> Info
          </button>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Ubah Data Warga</h2>
        <p>Perbarui data warga apabila terjadi perubahan kondisi ekonomi, tempat tinggal, atau informasi identitas. Validasi dilakukan sebelum penyimpanan.</p>
      </div>

      <div className="toolbar">
        <div className="search" style={{ maxWidth: '100%', flex: 1 }}>
          <Icon name="search" />
          <input placeholder="Cari nama atau NIK…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
          {filtered.length} warga
        </div>
      </div>

      <div className="card">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Warga</th>
                <th>Pekerjaan & Ekonomi</th>
                <th>Tempat Tinggal</th>
                <th>Skor Prioritas</th>
                <th>Validitas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(w => {
                const skor = SIB.skorPrioritas(w);
                const vv = SIB.validitasMeta[w.validitas];
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
                      <div style={{ fontWeight: 600 }}>{w.kondisiRumah}</div>
                      <div className="cell-meta">{w.statusRumah}</div>
                    </td>
                    <td><ScoreChip skor={skor} /></td>
                    <td><Badge tone={vv.tone}>{vv.label}</Badge></td>
                    <td className="num">
                      <button className="btn btn-soft btn-sm" onClick={e => { e.stopPropagation(); setOpen(w); }}>
                        <Icon name="edit" /> Ubah
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="empty"><Icon name="search" /><div>Tidak ada warga yang cocok.</div></div>
        )}
      </div>

      {open && <UbahForm warga={open} onClose={() => setOpen(null)} onSimpan={simpan} />}
    </div>
  );
}

Object.assign(window, { UbahDataWarga });
