'use client';
import { useEffect, useState } from 'react';

// Alterna claro/escuro. Fica na barra lateral (desktop) e no menu "Mais" (celular).
export default function ThemeToggle({ className = '' }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.getAttribute('data-theme') === 'dark');
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
    <button type="button" onClick={toggle} className={className} aria-label="Alternar tema">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="icone">
        {dark
          ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>
          : <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />}
      </svg>
      {dark ? 'Modo claro' : 'Modo escuro'}
    </button>
  );
}
