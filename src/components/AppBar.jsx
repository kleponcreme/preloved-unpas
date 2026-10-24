import { Icon } from './Icons';
import { useBack } from '../hooks/useBack';

export default function AppBar({ title, back = true, fallback = '/', right }) {
  const goBack = useBack(fallback);
  return (
    <header className="appbar">
      {back ? (
        <button className="iconbtn" onClick={goBack} aria-label="Kembali"><Icon.Back /></button>
      ) : (
        <span style={{ width: 12 }} />
      )}
      <h1>{title}</h1>
      {right}
    </header>
  );
}
