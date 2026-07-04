'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import ThemeToggle from './theme-toggle';

const links = [
  { href: '/', label: 'Visão geral' },
  { href: '/carteira', label: 'Carteira' },
  { href: '/recomendacoes', label: 'Recomendações' },
  { href: '/alvos', label: 'Alvos' },
  { href: '/registrar', label: 'Registrar' },
  { href: '/negociacoes', label: 'Negociações' },
  { href: '/cartoes', label: 'Cartões' },
  { href: '/faturas', label: 'Faturas' },
  { href: '/dividendos', label: 'Proventos' },
  { href: '/caixa', label: 'Caixa' },
  { href: '/saldos', label: 'Saldos' },
  { href: '/meta', label: 'Meta' },
];

export default function Nav() {
  const path = usePathname();
  const [role, setRole] = useState('dono');
  useEffect(() => {
    const m = document.cookie.match(/(?:^|; )app_role=([^;]+)/);
    setRole(m ? decodeURIComponent(m[1]) : 'dono');
  }, []);
  if (path === '/login') return null;

  const visiveis = role === 'pai' ? links.filter((l) => l.href === '/caixa') : links;

  async function sair() {
    try { await fetch('/api/logout', { method: 'POST' }); } catch {}
    window.location.href = '/login';
  }

  return (
    <nav style={{ maxWidth: 1160, margin: '0 auto 4px', padding: '0 4px 14px', display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
      {visiveis.map((l) => {
        const ativo = l.href === '/' ? path === '/' : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            style={{
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
              padding: '7px 14px',
              borderRadius: 9,
              color: ativo ? '#fff' : 'var(--ink-soft)',
              background: ativo ? 'var(--forest)' : 'transparent',
            }}
          >
            {l.label}
          </Link>
        );
      })}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
        <ThemeToggle />
        <button onClick={sair} title="Sair" style={{
          fontSize: 12.5, fontWeight: 600, padding: '7px 12px', borderRadius: 9, cursor: 'pointer',
          border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink-soft)',
        }}>Sair</button>
      </div>
    </nav>
  );
}
