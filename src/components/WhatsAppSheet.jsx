import { useState } from 'react';
import Sheet from './Sheet';
import { Icon } from './Icons';
import { linkWhatsApp } from '../lib/whatsapp';

export default function WhatsAppSheet({ nama, nomor, pesanAwal, catatan, onClose }) {
  const [pesan, setPesan] = useState(pesanAwal);
  return (
    <Sheet
      title={`Chat ${nama} di WhatsApp`}
      onClose={onClose}
      header={
        <>
          <span className="avatar" style={{ background: 'var(--green)', color: '#fff' }}><Icon.Wa /></span>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 17 }}>Chat {nama} di WhatsApp</h2>
            <div className="meta">Pesan pembuka sudah disiapkan</div>
          </div>
        </>
      }
    >
      <label className="field">
        <span className="flabel">Pesan pembuka (bisa diubah)</span>
        <textarea rows={5} value={pesan} onChange={(e) => setPesan(e.target.value)} />
      </label>
      {catatan && <div className="note y"><Icon.Shield /><span>{catatan}</span></div>}
      <a className="btn wa" href={linkWhatsApp(nomor, pesan)} target="_blank" rel="noopener noreferrer" onClick={onClose}>
        <Icon.Wa />Buka WhatsApp
      </a>
      {!nomor && <span className="meta center">Nomor WhatsApp belum tersedia, jadi WhatsApp akan meminta kamu memilih kontak.</span>}
    </Sheet>
  );
}
