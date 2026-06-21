/* ============================================================
   SIBANSOS RT — App root
   ============================================================ */

const STORE_KEY = 'sibansos_rt_data_v1';

function App() {
  const [page, setPage] = useState('statistik');
  const [navOpen, setNavOpen] = useState(false);
  const { toasts, push } = useToasts();

  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return SIB.WARGA_SEED;
  });

  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) {}
  }, [data]);

  const reset = () => {
    setData(SIB.WARGA_SEED);
    push('Data prototipe dikembalikan ke kondisi awal.', 'green');
  };

  const titles = {
    statistik: { t: 'Statistik & Beranda', c: 'Dashboard' },
    verifikasi: { t: 'Verifikasi Data Warga', c: 'Pengelolaan Data' },
    status: { t: 'Status Penerima Bantuan', c: 'Seleksi' },
    ubah: { t: 'Ubah Data Warga', c: 'Pengelolaan Data' },
  };
  const cur = titles[page];

  return (
    <div className="app">
      <Sidebar page={page} setPage={setPage} open={navOpen} onClose={() => setNavOpen(false)} />
      {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <button className="iconbtn menu-btn" onClick={() => setNavOpen(true)}><Icon name="menu" /></button>
          <div>
            <div className="crumb">{cur.c}</div>
            <h1>{cur.t}</h1>
          </div>
          <div className="topbar-actions">
            <button className="btn btn-ghost btn-sm no-print" onClick={reset} title="Kembalikan data dummy ke awal">
              <Icon name="history" /> Reset Data
            </button>
            <div className="row" style={{ gap: 9, paddingLeft: 6 }}>
              <div className="user-av" style={{ width: 36, height: 36 }}>PR</div>
            </div>
          </div>
        </header>

        <main className="content">
          {page === 'statistik' && <Statistik data={data} toast={push} goTo={setPage} />}
          {page === 'verifikasi' && <Verifikasi data={data} setData={setData} toast={push} />}
          {page === 'status' && <StatusPenerima data={data} setData={setData} toast={push} />}
          {page === 'ubah' && <UbahDataWarga data={data} setData={setData} toast={push} />}
        </main>
      </div>

      <ToastHost toasts={toasts} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
