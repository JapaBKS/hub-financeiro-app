'use client';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const atual = document.documentElement.getAttribute('data-theme') === 'dark';
    setDark(atual);
  }, []);

  function toggle() {
    const novo = !dark;
    setDark(novo);
    const root = document.documentElement;
    if (novo) root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    try { localStorage.setItem('tema', novo ? 'dark' : 'light'); } catch {}
  }

  return (
    <button onClick={toggle} title={dark ? 'Modo claro' : 'Modo escuro'} aria-label="Alternar tema" style={{
      fontSize: 14, lineHeight: 1, padding: '7px 12px', borderRadius: 9, cursor: 'pointer',
      border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink-soft)',
    }}>{dark ? '☀' : '☾'}</button>
  );
}
