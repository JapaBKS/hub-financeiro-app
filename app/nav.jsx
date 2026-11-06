'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
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
  mais: <><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></>,
  sair: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
  fechar: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
};

function Icone({ nome, tamanho = 17, className = '' }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      className={`icone ${className}`}>
      {ICONES[nome]}
    </svg>
  );
}

// 12 telas em 3 grupos: mesma ordem na barra lateral (desktop) e no menu "Mais" (celular)
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

// Rosácea de traços finos, como a de uma cédula. Calculada uma vez (determinística,
// igual no servidor e no navegador) e usada como marca d'água da barra lateral.
function rosacea(R, r, d, voltas, passos = 900) {
  let p = '';
  for (let i = 0; i <= passos; i++) {
    const t = (i / passos) * Math.PI * 2 * voltas;
    const x = (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
    const y = (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
    p += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return p;
}
const ROSACEA = [rosacea(120, 33, 62, 33), rosacea(120, 45, 30, 3), rosacea(96, 27, 52, 27)];

function Marca({ tamanho = 30 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 32 32" aria-hidden="true" className="marca">
      <rect width="32" height="32" rx="9" fill="var(--brass)" />
      <path d="M10 9v14M22 9v14M10 16h12" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

// atalhos fixos da barra inferior no celular; o resto fica em "Mais"
const ABAS_CELULAR = ['/', '/carteira', '/cartoes', '/caixa'];
const ROTULO_CURTO = { '/': 'Início' };

export default function Nav() {
  const path = usePathname();
  const [role, setRole] = useState('dono');
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const m = document.cookie.match(/(?:^|; )app_role=([^;]+)/);
    setRole(m ? decodeURIComponent(m[1]) : 'dono');
  }, []);

  useEffect(() => { setAberto(false); }, [path]);

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
  const abas = todos.filter((l) => ABAS_CELULAR.includes(l.href));
  const maisAtivo = !abas.some((l) => ehAtivo(l.href));

  async function sair() {
    try { await fetch('/api/logout', { method: 'POST' }); } catch {}
    window.location.href = '/login';
  }

  return (
    <>
      {/* DESKTOP: barra lateral fixa */}
      <aside className="lateral" aria-label="Menu">
        <svg className="lateral-rosacea" viewBox="-130 -130 260 260" aria-hidden="true">
          {ROSACEA.map((d, i) => <path key={i} d={d} />)}
        </svg>
        <Link href={role === 'pai' ? '/caixa' : '/'} className="lateral-marca">
          <Marca />
          <span><b>Hub Financeiro</b></span>
        </Link>

        <nav aria-label="Principal" className="lateral-nav">
          {grupos.map((g) => (
            <section key={g.titulo}>
              {grupos.length > 1 && <div className="lateral-grupo">{g.titulo}</div>}
              {g.itens.map((l) => (
                <Link key={l.href} href={l.href} aria-current={ehAtivo(l.href) ? 'page' : undefined} className="lateral-link">
                  <Icone nome={l.icone} tamanho={17} />
                  {l.label}
                </Link>
              ))}
            </section>
          ))}
        </nav>

        <div className="lateral-rodape">
          <ThemeToggle className="lateral-link" />
          <button type="button" onClick={sair} className="lateral-link">
            <Icone nome="sair" tamanho={17} />Sair
          </button>
        </div>
      </aside>

      {/* CELULAR: topo com a marca e barra de abas embaixo */}
      <header className="topo-celular">
        <Link href={role === 'pai' ? '/caixa' : '/'} className="lateral-marca" aria-label="Início">
          <Marca tamanho={28} />
          <span><b>Hub Financeiro</b></span>
        </Link>
        {role === 'pai' && (
          <button type="button" onClick={sair} className="topo-sair" aria-label="Sair"><Icone nome="sair" tamanho={18} /></button>
        )}
      </header>

      {role !== 'pai' && (
        <nav className="abas-celular" aria-label="Atalhos">
          {abas.map((l) => (
            <Link key={l.href} href={l.href} aria-current={ehAtivo(l.href) ? 'page' : undefined} className="aba">
              <Icone nome={l.icone} tamanho={21} />
              <span>{ROTULO_CURTO[l.href] || l.label}</span>
            </Link>
          ))}
          <button type="button" onClick={() => setAberto(true)} aria-haspopup="dialog" aria-expanded={aberto}
            aria-current={maisAtivo ? 'page' : undefined} className="aba">
            <Icone nome="mais" tamanho={21} />
            <span>Mais</span>
          </button>
        </nav>
      )}

      {aberto && (
        <div className="folha" role="dialog" aria-modal="true" aria-label="Todas as telas">
          <div className="folha-fundo" onClick={() => setAberto(false)} />
          <div className="folha-painel">
            <div className="folha-alca" aria-hidden="true" />
            {grupos.map((g) => (
              <section key={g.titulo} className="folha-grupo">
                <div className="folha-titulo">{g.titulo}</div>
                <div className="folha-grade">
                  {g.itens.map((l) => (
                    <Link key={l.href} href={l.href} onClick={() => setAberto(false)} aria-current={ehAtivo(l.href) ? 'page' : undefined} className="folha-link">
                      <Icone nome={l.icone} tamanho={20} />
                      {l.label}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
            <div className="folha-rodape">
              <ThemeToggle className="folha-link" />
              <button type="button" onClick={sair} className="folha-link"><Icone nome="sair" tamanho={20} />Sair</button>
              <button type="button" onClick={() => setAberto(false)} className="folha-link folha-fechar"><Icone nome="fechar" tamanho={20} />Fechar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
