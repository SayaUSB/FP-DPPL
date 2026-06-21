/* ============================================================
   F03 / UC03 — Melihat Statistik Warga & Bantuan
   ============================================================ */

function Statistik({ data, toast, goTo }) {
  const [showInfo, setShowInfo] = useState(true);
  
  useEffect(() => {
    setShowInfo(true);
  }, []);
  
  // ---- Aggregations ----
  const stats = useMemo(() => {
    const total = data.length;
    const penerima = data.filter(w => w.statusBantuan === 'penerima').length;
    const cadangan = data.filter(w => w.statusBantuan === 'cadangan').length;
    const valid = data.filter(w => w.validitas === 'valid').length;
    const menunggu = data.filter(w => w.validitas === 'menunggu').length;
    const perlu = data.filter(w => ['perlu_perbaikan', 'tidak_valid'].includes(w.validitas)).length;
    const totalPendapatan = data.reduce((s, w) => s + w.pendapatan, 0);
    const rata = total ? Math.round(totalPendapatan / total) : 0;

    // distribusi pendapatan per kapita (kelas)
    const kelasLabels = ['< 600rb', '600rb–1jt', '1–1.5jt', '> 1.5jt'];
    const dist = [0, 0, 0, 0];
    data.forEach(w => {
      const pk = w.pendapatan / (w.tanggungan + 1);
      if (pk < 600000) dist[0]++;
      else if (pk < 1000000) dist[1]++;
      else if (pk < 1500000) dist[2]++;
      else dist[3]++;
    });

    // distribusi prioritas
    const prio = { 'Sangat Tinggi': 0, 'Tinggi': 0, 'Sedang': 0, 'Rendah': 0 };
    data.forEach(w => { prio[SIB.tingkatPrioritas(SIB.skorPrioritas(w)).label]++; });

    return { total, penerima, cadangan, valid, menunggu, perlu, rata, kelasLabels, dist, prio };
  }, [data]);

  const K = SIB.KONFIG;
  const kuotaTerisi = stats.penerima;
  const kuotaPersen = Math.min(100, kuotaTerisi / K.kuota * 100);

  // ---- Export ----
  const exportCSV = () => {
    const head = ['Nama', 'NIK', 'Alamat', 'Pekerjaan', 'Pendapatan', 'Tanggungan', 'Kondisi Rumah', 'Skor Prioritas', 'Validitas', 'Status Bantuan'];
    const rows = data.map(w => [
      w.nama, w.nik, w.alamat, w.pekerjaan, w.pendapatan, w.tanggungan, w.kondisiRumah,
      SIB.skorPrioritas(w), SIB.validitasMeta[w.validitas].label, SIB.statusMeta[w.statusBantuan].label,
    ]);
    const csv = [head, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'statistik-bansos-rt03.csv'; a.click();
    URL.revokeObjectURL(url);
    toast('Laporan Excel (.csv) berhasil diunduh.', 'green');
  };
  const exportPDF = () => {
    toast('Menyiapkan laporan PDF — gunakan dialog cetak.', 'blue');
    setTimeout(() => window.print(), 350);
  };

  const statCards = [
    { label: 'Total Warga Terdaftar', val: stats.total, icon: 'users', bg: 'var(--blue-50)', fg: 'var(--blue-700)', delta: 'KK aktif di RT 03' },
    { label: 'Penerima Ditetapkan', val: `${stats.penerima}/${K.kuota}`, icon: 'shield', bg: 'var(--green-bg)', fg: 'oklch(0.45 0.11 150)', delta: `${K.kuota - kuotaTerisi} kuota tersisa` },
    { label: 'Data Tervalidasi', val: stats.valid, icon: 'verify', bg: 'var(--blue-50)', fg: 'var(--blue-700)', delta: `${stats.menunggu} menunggu diperiksa` },
    { label: 'Rata-rata Pendapatan', val: SIB.fmtRupiahShort(stats.rata), icon: 'coins', bg: 'var(--amber-bg)', fg: 'oklch(0.5 0.1 60)', delta: 'per KK / bulan' },
  ];

  const validitasSeg = [
    { label: 'Valid', value: stats.valid, color: 'var(--green)' },
    { label: 'Menunggu', value: stats.menunggu, color: 'var(--amber)' },
    { label: 'Perlu Perbaikan', value: stats.perlu, color: 'var(--red)' },
  ];

  return (
    <div className="content-inner">
      {showInfo && (
        <InfoModal
          title="Statistik & Beranda"
          desc="Halaman ini menampilkan ringkasan menyeluruh kondisi warga, progres penyaluran bantuan, dan distribusi data untuk evaluasi. Semua data dapat diunduh dalam format Excel atau PDF."
          items={[
            { label: '📊 Kartu Statistik', text: 'Menampilkan total warga terdaftar, jumlah penerima & sisa kuota, data tervalidasi, dan rata-rata pendapatan keluarga.' },
            { label: '💰 Distribusi Pendapatan per Kapita', text: 'Grafik batang menunjukkan jumlah KK di setiap kelas penghasilan. Makin banyak di kelas bawah = prioritas bantuan lebih tinggi.' },
            { label: '✅ Status Validitas', text: 'Donut chart memperlihatkan jumlah data yang Valid, Menunggu, atau Perlu Perbaikan. Semua warga harus Valid sebelum seleksi penerima.' },
            { label: '🎯 Distribusi Prioritas (AI)', text: 'Histogram menurut skor Asisten AI: Sangat Tinggi (≥70), Tinggi (55–69), Sedang (40–54), Rendah (<40). Klik tombol "Buka penetapan penerima" untuk mulai seleksi.' },
          ]}
          onClose={() => setShowInfo(false)}
        />
      )}
      <div className="spread page-intro" style={{ alignItems: 'flex-start' }}>
        <div>
          <span className="uc-tag"><Icon name="chart" /> F03 · UC03</span>
          <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Statistik Warga & Bantuan</h2>
          <p>Ringkasan kondisi warga dan progres penyaluran bantuan untuk periode berjalan. Data dapat diunduh sebagai bahan evaluasi dan pertanggungjawaban.</p>
        </div>
        <div className="row no-print">
          <button className="btn btn-ghost btn-sm" onClick={() => setShowInfo(true)} title="Buka penjelasan">
            <Icon name="sparkle" /> Info
          </button>
          <button className="btn btn-ghost" onClick={exportPDF}><Icon name="doc" /> PDF</button>
          <button className="btn btn-primary" onClick={exportCSV}><Icon name="download" /> Excel</button>
        </div>
      </div>

      {/* Periode banner */}
      <div className="card card-pad" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Periode Aktif</div>
          <div style={{ fontSize: 16, fontWeight: 800, marginTop: 3 }}>{K.periode}</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{K.rt} · {K.kelurahan} · Nominal {SIB.fmtRupiah(K.nominal)}/KK</div>
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="spread" style={{ marginBottom: 7 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-2)' }}>Kuota penerima terisi</span>
            <span style={{ fontSize: 12.5, fontWeight: 800 }}>{kuotaTerisi} / {K.kuota}</span>
          </div>
          <div className="quota-bar">
            <span style={{ width: kuotaPersen + '%', background: 'var(--green)' }} />
          </div>
        </div>
      </div>

      {/* Stat cards */}
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

      {/* Charts row 1 */}
      <div className="grid-3 mt16">
        <div className="card">
          <div className="card-head">
            <Icon name="chart" />
            <div><h3>Distribusi Pendapatan per Kapita</h3><div className="sub">Jumlah KK menurut kelas penghasilan / jiwa</div></div>
          </div>
          <div className="card-pad">
            <BarChart data={stats.kelasLabels.map((l, i) => ({
              label: l, value: stats.dist[i],
              color: ['var(--red)', 'var(--amber)', 'var(--blue-500)', 'var(--faint)'][i],
            }))} />
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <Icon name="verify" />
            <div><h3>Status Validitas</h3></div>
          </div>
          <div className="card-pad">
            <div className="donut-wrap">
              <Donut segments={validitasSeg} total={stats.total}
                centerBig={stats.total} centerSmall="Total KK" />
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

      {/* Charts row 2 — prioritas */}
      <div className="card mt16">
        <div className="card-head">
          <Icon name="sparkle" />
          <div style={{ flex: 1 }}><h3>Distribusi Tingkat Prioritas (Asisten AI)</h3><div className="sub">Hasil skoring kebutuhan dari data administratif & kondisi rumah</div></div>
          <button className="btn btn-soft btn-sm no-print" onClick={() => goTo('status')}>Buka penetapan penerima →</button>
        </div>
        <div className="card-pad">
          <div className="bars" style={{ height: 150 }}>
            {Object.entries(stats.prio).map(([label, value], i) => (
              <div className="bar-col" key={label}>
                <div className="bar-val">{value}</div>
                <div className="bar" style={{
                  height: (value / Math.max(...Object.values(stats.prio), 1) * 100) + '%',
                  background: ['var(--red)', 'var(--amber)', 'var(--blue-500)', 'var(--faint)'][i],
                }} />
                <div className="bar-label">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Statistik });
