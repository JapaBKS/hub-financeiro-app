'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import ThemeToggle from './theme-toggle';

const links = [
  { href: '/', label: 'Visão geral', icone: '◎' },
  { href: '/carteira', label: 'Carteira', icone: '▣' },
  { href: '/biblioteca', label: 'Biblioteca', icone: '☰' },
  { href: '/apuracao', label: 'Apuração', icone: '§' },
  { href: '/recomendacoes', label: 'Recomendações', icone: '↗' },
  { href: '/alvos', label: 'Alvos', icone: '◈' },
  { href: '/negociacoes', label: 'Negociações', icone: '⇄' },
  { href: '/cartoes', label: 'Cartões', icone: '▤' },
  { href: '/dividendos', label: 'Proventos', icone: '❖' },
  { href: '/caixa', label: 'Caixa', icone: '◐' },
  { href: '/saldos', label: 'Saldos', icone: '≡' },
  { href: '/meta', label: 'Meta', icone: '◇' },
];

// no celular, esses 4 ficam na barra de baixo; o resto vai pro "Mais"
const PRINCIPAIS = ['/', '/carteira', '/caixa', '/cartoes'];

export default function Nav() {
  const path = usePathname();
  const [role, setRole] = useState('dono');
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    const m = document.cookie.match(/(?:^|; )app_role=([^;]+)/);
    setRole(m ? decodeURIComponent(m[1]) : 'dono');
  }, []);
  useEffect(() => { setAberto(false); }, [path]);
  if (path === '/login') return null;

  const visiveis = role === 'pai' ? links.filter((l) => l.href === '/caixa') : links;
  const ehAtivo = (href) => (href === '/' ? path === '/' : path.startsWith(href));

  const principais = visiveis.filter((l) => PRINCIPAIS.includes(l.href));
  const secundarios = visiveis.filter((l) => !PRINCIPAIS.includes(l.href));

  async function sair() {
    try { await fetch('/api/logout', { method: 'POST' }); } catch {}
    window.location.href = '/login';
  }

  const acoes = (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <ThemeToggle />
      <button onClick={sair} title="Sair" style={{
        fontSize: 12.5, fontWeight: 600, padding: '7px 12px', borderRadius: 9, cursor: 'pointer',
        border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink-soft)',
      }}>Sair</button>
    </div>
  );

  return (
    <>
      {/* desktop: barra inline no topo */}
      <nav className="nav-inline-wrap" style={{ maxWidth: 1160, margin: '0 auto 4px', padding: '0 4px 14px' }}>
        <div className="nav-inline">
          {visiveis.map((l) => (
            <Link key={l.href} href={l.href} className={ehAtivo(l.href) ? 'navlink active' : 'navlink'}
              style={{ fontSize: 13, fontWeight: 500, textDecoration: 'none', padding: '7px 14px', borderRadius: 9, display: 'block' }}>
              {l.label}
            </Link>
          ))}
          <div style={{ marginLeft: 'auto' }}>{acoes}</div>
        </div>
      </nav>

      {/* celular: folha do "Mais" */}
      {aberto && (
        <div className="nav-sheet-fundo" onClick={() => setAberto(false)}>
          <div className="nav-sheet" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <b style={{ fontSize: 14 }}>Menu</b>
              {acoes}
            </div>
            <div className="nav-sheet-grid">
              {secundarios.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setAberto(false)}
                  className={ehAtivo(l.href) ? 'navlink active' : 'navlink'}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    padding: '14px 6px', borderRadius: 12, textDecoration: 'none',
                    fontSize: 12, fontWeight: 600, textAlign: 'center',
                  }}>
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{l.icone}</span>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* celular: barra fixa embaixo */}
      <nav className="tabbar">
        {principais.map((l) => (
          <Link key={l.href} href={l.href} className={ehAtivo(l.href) ? 'tabitem ativo' : 'tabitem'}>
            <span className="tabicone">{l.icone}</span>
            <span className="tablabel">{l.label}</span>
          </Link>
        ))}
        {secundarios.length > 0 && (
          <button onClick={() => setAberto((v) => !v)} className={aberto ? 'tabitem ativo' : 'tabitem'} aria-label="Mais">
            <span className="tabicone">⋯</span>
            <span className="tablabel">Mais</span>
          </button>
        )}
      </nav>
    </>
  );
}
