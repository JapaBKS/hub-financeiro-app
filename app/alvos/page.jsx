import { supabaseServer } from '../../lib/supabase';
import AlvosClient from './alvos-client';
import MetasClasse from './metas-classe-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Alvos() {
  const sb = supabaseServer();
  const [{ data: todasClasses }, { data: assets }] = await Promise.all([
    sb.from('asset_classes').select('id, name, target_pct').order('target_pct', { ascending: false }),
    sb.from('assets').select('ticker, target_pct, class_id, congelado'),
  ]);

  // toda classe vira uma aba (sem lista fixa no código)
  const grupos = (todasClasses || []).map((c) => ({
    class_id: c.id,
    name: c.name,
    groupTarget: Number(c.target_pct) || 0,
    itens: (assets || [])
      .filter((a) => a.class_id === c.id && a.target_pct != null)
      .map((a) => ({
        ticker: a.ticker,
        pct: Math.round(Number(a.target_pct) * 10000) / 100, // fração -> %
        congelado: !!a.congelado,
      }))
      .sort((a, b) => b.pct - a.pct),
    // ativos que estão na classe mas sem peso definido (ex.: legado a vender)
    semPeso: (assets || []).filter((a) => a.class_id === c.id && a.target_pct == null).length,
  }));

  return (
    <div className="wrap" style={{ maxWidth: 600 }}>
      <header className="topbar">
        <div className="brand">
          <div className="mark" />
          <div><b>Carteira recomendada</b><span>abas e pesos por ativo</span></div>
        </div>
        <a href="/recomendacoes" style={{ fontSize: 13, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 500 }}>ver sinais →</a>
      </header>
      <MetasClasse classes={todasClasses || []} />
      <AlvosClient grupos={grupos} />
    </div>
  );
}
