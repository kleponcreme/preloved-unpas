// Tampil kalau kunci Firebase belum diisi di Netlify
export default function SetupFirebase() {
  return (
    <main className="scroll">
      <div className="wrap">
        <div className="card card-b stack">
          <h1 style={{ margin: 0, fontSize: 20 }}>Website belum tersambung ke Firebase</h1>
          <p className="desc">Isi kunci Firebase di Netlify, lalu tayangkan ulang.</p>
          <ol className="desc" style={{ paddingLeft: 18, margin: 0 }}>
            <li>Buka Netlify → situs ini → <b>Site configuration</b> → <b>Environment variables</b>.</li>
            <li>Isi semua variabel yang diawali <code>VITE_FIREBASE_</code> (lihat Panduan, Langkah 6).</li>
            <li>Buka <b>Deploys</b> → <b>Trigger deploy</b> → <b>Deploy site</b>, tunggu sampai selesai, lalu muat ulang halaman ini.</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
