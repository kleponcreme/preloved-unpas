export default function Loading({ teks = 'Memuat…' }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{teks}</span>
    </div>
  );
}
