'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment, useState, useEffect } from 'react';
import ThemeToggle from './theme-toggle';

// Ícones de traço (24x24, herdam a cor do texto). Um conjunto só, no lugar dos
// caracteres soltos (◎ ▣ ☰ ...) que variavam de tamanho entre aparelhos.
const ICONES = {
  painel: <><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>,
  carteira: <><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" /><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" /></>,
  meta: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
  recomendacoes: <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></>,
  alvos: <><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></>,
  negociacoes: <><path d="M8 3 4 7l4 4" /><path d="M4 7h16" /><path d="m16 21 4-4-4-4" /><path d="M20 17H4" /></>,
  proventos: <><circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1 1 10.34 18" /><path d="M7 6h1v4" /><path d="m16.71 13.88.7.71-2.82 2.82" /></>,
  biblioteca: <><path d="m16 6 4 14" /><path d="M12 6v14" /><path d="M8 8v12" /><path d="M4 4v16" /></>,
  apuracao: <><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></>,
  cartoes: <><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></>,
  caixa: <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></>,
  saldos: <><line x1="3" y1="22" x2="21" y2="22" /><line x1="6" y1="18" x2="6" y2="11" /><line x1="10" y1="18" x2="10" y2="11" /><line x1="14" y1="18" x2="14" y2="11" /><line x1="18" y1="18" x2="18" y2="11" /><polygon points="12 2 20 7 4 7" /></>,
  seta: <path d="m6 9 6 6 6-6" />,
  fechar: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
};

function Icone({ nome, tamanho = 17, className = '' }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      className={`flex-none ${className}`}>
      {ICONES[nome]}
    </svg>
  );
}

// 12 telas em 3 grupos: é a mesma ordem no desktop (divisores) e no celular (seções)
const GRUPOS = [
  { titulo: 'Painel', itens: [
    { href: '/', label: 'Visão geral', icone: 'painel' },
    { href: '/carteira', label: 'Carteira', icone: 'carteira' },
    { href: '/meta', label: 'Meta', icone: 'meta' },
  ] },
  { titulo: 'Investir', itens: [
    { href: '/recomendacoes', label: 'Recomendações', icone: 'recomendacoes' },
    { href: '/alvos', label: 'Alvos', icone: 'alvos' },
    { href: '/negociacoes', label: 'Negociações', icone: 'negociacoes' },
    { href: '/dividendos', label: 'Proventos', icone: 'proventos' },
    { href: '/biblioteca', label: 'Biblioteca', icone: 'biblioteca' },
    { href: '/apuracao', label: 'Apuração', icone: 'apuracao' },
  ] },
  { titulo: 'Dinheiro', itens: [
    { href: '/cartoes', label: 'Cartões', icone: 'cartoes' },
    { href: '/caixa', label: 'Caixa', icone: 'caixa' },
    { href: '/saldos', label: 'Saldos', icone: 'saldos' },
  ] },
];

export default function Nav() {
  const path = usePathname();
  const [role, setRole] = useState('dono');
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const m = document.cookie.match(/(?:^|; )app_role=([^;]+)/);
    setRole(m ? decodeURIComponent(m[1]) : 'dono');
  }, []);

  // fecha ao trocar de tela e, no desktop estreito, rola a barra até a tela atual
  useEffect(() => {
    setAberto(false);
    const ativo = document.querySelector('nav[aria-label="Principal"] a[aria-current="page"]');
    if (ativo && ativo.scrollIntoView) ativo.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [path, role]);

  // menu aberto: trava a rolagem da página e fecha com Esc
  useEffect(() => {
    if (!aberto) return undefined;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const aoTeclar = (e) => { if (e.key === 'Escape') setAberto(false); };
    window.addEventListener('keydown', aoTeclar);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto]);

  if (path === '/login') return null;

  // o perfil "pai" só enxerga o Caixa
  const grupos = GRUPOS
    .map((g) => ({ ...g, itens: role === 'pai' ? g.itens.filter((l) => l.href === '/caixa') : g.itens }))
    .filter((g) => g.itens.length > 0);
  const todos = grupos.flatMap((g) => g.itens);
  const ehAtivo = (href) => (href === '/' ? path === '/' : path.startsWith(href));
  const atual = todos.find((l) => ehAtivo(l.href));

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
      {/* DESKTOP: uma linha só, com ícones e divisores entre os grupos.
          Se faltar espaço, rola na horizontal em vez de quebrar em duas linhas. */}
      <nav aria-label="Principal" className="hidden min-[721px]:flex items-center gap-3 max-w-[1160px] mx-auto px-1 pb-3.5">
        <div className="menu-rola flex flex-1 min-w-0 items-center gap-1 overflow-x-auto">
          {grupos.map((g, gi) => (
            <Fragment key={g.titulo}>
              {gi > 0 && <span aria-hidden="true" className="flex-none w-px h-5 mx-2 bg-line" />}
              {g.itens.map((l) => (
                <Link key={l.href} href={l.href} aria-current={ehAtivo(l.href) ? 'page' : undefined}
                  className={`navlink flex-none flex items-center gap-2 px-3 py-[7px] rounded-[9px] text-[13px] font-medium no-underline whitespace-nowrap ${ehAtivo(l.href) ? 'active' : ''}`}>
                  <Icone nome={l.icone} tamanho={16} />
                  {l.label}
                </Link>
              ))}
            </Fragment>
          ))}
        </div>
        <div className="flex-none">{acoes}</div>
      </nav>

      {/* CELULAR: barra fixa no topo com a tela atual; toque abre o menu suspenso */}
      <div className="min-[721px]:hidden sticky top-0 z-50 -mx-3 -mt-2.5 mb-3 px-3 py-2 bg-paper [border-bottom:1px_solid_var(--line)]">
        <div className="flex items-center gap-2.5">
          <Link href="/" aria-label="Início" className="mark block flex-none" style={{ width: 30, height: 30 }} />
          <button type="button" onClick={() => setAberto(true)} aria-haspopup="true" aria-expanded={aberto}
            className="flex flex-1 min-w-0 items-center gap-2.5 px-3 py-2 rounded-xl [border:1px_solid_var(--line)] bg-card text-ink font-display text-[15px] font-semibold text-left">
            {atual && <Icone nome={atual.icone} tamanho={18} className="text-forest-2" />}
            <span className="flex-1 min-w-0 truncate">{atual ? atual.label : 'Menu'}</span>
            <Icone nome="seta" tamanho={18} className="text-ink-faint" />
          </button>
        </div>
      </div>

      {aberto && (
        <div className="min-[721px]:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-[rgba(20,24,22,.45)]" onClick={() => setAberto(false)} />
          <div className="menu-suspenso absolute left-0 right-0 top-0 max-h-[88vh] overflow-y-auto bg-card [border-bottom:1px_solid_var(--line)] rounded-b-2xl shadow-card px-3.5 pt-3 pb-4">
            <div className="flex items-center justify-between mb-2">
              <b className="font-display text-[15px]">Menu</b>
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar menu"
                className="flex items-center justify-center w-9 h-9 rounded-[10px] [border:1px_solid_var(--line)] bg-surface text-ink-soft">
                <Icone nome="fechar" tamanho={18} />
              </button>
            </div>

            {grupos.map((g) => (
              <section key={g.titulo} className="mt-3">
                <div className="eyebrow mb-1.5 px-1">{g.titulo}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
                  {g.itens.map((l) => (
                    <Link key={l.href} href={l.href} onClick={() => setAberto(false)} aria-current={ehAtivo(l.href) ? 'page' : undefined}
                      className={`navlink flex items-center gap-2.5 px-3 py-3 rounded-xl text-[13.5px] font-semibold no-underline ${ehAtivo(l.href) ? 'active' : ''}`}>
                      <Icone nome={l.icone} tamanho={18} />
                      {l.label}
                    </Link>
                  ))}
                </div>
              </section>
            ))}

            <div className="flex items-center justify-between mt-4 pt-3 [border-top:1px_solid_var(--line)]">
              <span className="text-[12px] text-ink-faint">Tema e conta</span>
              {acoes}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
