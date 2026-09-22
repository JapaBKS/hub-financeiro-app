import { supabaseServer } from '../lib/supabase';
import { hojeISO } from '../lib/dominio/datas';

import { brl as fmt } from '../lib/format';
const brDia = (iso) => (iso || '').slice(0, 10).split('-').reverse().slice(0, 2).join('/');

// Alerta de saídas do Caixa não pagas: vencidas + hoje + próximos N dias.
export default async function AlertaContas({ dias = 3, compact = false }) {
  const sb = supabaseServer();
  const hoje = hojeISO();
  const limite = new Date();
  limite.setDate(limite.getDate() + dias);
  const limiteISO = limite.toISOString().slice(0, 10);

  const { data: rows } = await sb
    .from('cashbook')
    .select('id, entry_date, details, amount, category')
    .eq('kind', 'saida')
    .eq('paid', false)
    .lte('entry_date', limiteISO)
    .order('entry_date', { ascending: true });

  const contas = rows || [];
  if (contas.length === 0) return null;

  const vencidas = contas.filter((c) => c.entry_date.slice(0, 10) < hoje);
  const deHoje = contas.filter((c) => c.entry_date.slice(0, 10) === hoje);
  const proximas = contas.filter((c) => c.entry_date.slice(0, 10) > hoje);
  const totalVenc = vencidas.reduce((s, c) => s + Number(c.amount), 0);
  const totalHoje = deHoje.reduce((s, c) => s + Number(c.amount), 0);

  const temUrgente = vencidas.length > 0 || deHoje.length > 0;
  const cor = temUrgente ? 'var(--down)' : 'var(--amber)';
  const bg = temUrgente ? 'var(--down-bg)' : 'var(--amber-bg)';

  const Linha = ({ c, tag, tagColor }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13 }}>
      <span style={{ minWidth: 42, fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-display)' }}>{brDia(c.entry_date)}</span>
      {tag && <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: tagColor, borderRadius: 4, padding: '1px 5px', whiteSpace: 'nowrap' }}>{tag}</span>}
      <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.details || c.category}</span>
      <b style={{ fontFamily: 'var(--font-display)', color: 'var(--down)' }}>{fmt(c.amount)}</b>
    </div>
  );

  return (
    <section style={{ borderRadius: 12, background: bg, border: `1px solid ${cor}33`, padding: '14px 16px', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <b style={{ fontSize: 13.5, color: cor }}>
          {temUrgente ? '⚠ Contas a pagar' : '🔔 Contas chegando'}
        </b>
        <a href="/caixa" style={{ fontSize: 12, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 600 }}>ver caixa →</a>
      </div>

      {(vencidas.length > 0 || deHoje.length > 0) && (
        <div style={{ display: 'flex', gap: 14, marginBottom: proximas.length ? 8 : 0, fontSize: 12.5 }}>
          {vencidas.length > 0 && <span style={{ color: 'var(--down)', fontWeight: 600 }}>{vencidas.length} vencida{vencidas.length > 1 ? 's' : ''} · {fmt(totalVenc)}</span>}
          {deHoje.length > 0 && <span style={{ color: cor, fontWeight: 600 }}>{deHoje.length} hoje · {fmt(totalHoje)}</span>}
        </div>
      )}

      {!compact && (
        <div>
          {vencidas.map((c) => <Linha key={c.id} c={c} tag="VENCIDA" tagColor="var(--down)" />)}
          {deHoje.map((c) => <Linha key={c.id} c={c} tag="HOJE" tagColor="var(--amber)" />)}
          {proximas.map((c) => <Linha key={c.id} c={c} tag={null} />)}
        </div>
      )}
    </section>
  );
}
