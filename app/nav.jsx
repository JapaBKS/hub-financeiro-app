'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Visão geral' },
  { href: '/carteira', label: 'Carteira' },
  { href: '/registrar', label: 'Registrar' },
  { href: '/cartoes', label: 'Cartões' },
  { href: '/faturas', label: 'Faturas' },
  { href: '/dividendos', label: 'Proventos' },
];

export default function Nav() {
  const path = usePathname();
  if (path === '/login') return null;

  return (
    <nav style={{ maxWidth: 1160, margin: '0 auto 4px', padding: '0 4px 14px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {links.map((l) => {
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
    </nav>
  );
}
