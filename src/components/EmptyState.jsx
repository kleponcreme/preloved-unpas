export default function EmptyState({ judul, teks, children }) {
  return (
    <div className="empty">
      <h3>{judul}</h3>
      {teks && <p>{teks}</p>}
      {children}
    </div>
  );
}
