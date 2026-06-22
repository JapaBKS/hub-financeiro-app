'use client';
import { useState } from 'react';

const NOISE = [
  'provisionado', '% aloca', 'valor provisionado', 'evento', 'previsão pagamento',
  'renda variável', 'fundos imobili', 'fundos listados', 'saldo', '[acesse',
];
function ehNoise(l) {
  const low = l.toLowerCase();
  return NOISE.some((n) => low.includes(n)) || /^\d+([.,]\d+)?%?\s*\|/.test(l);
}
function normKind(ev) {
  const e = ev.toUpperCase();
  if (e.startsWith('DIV')) return 'dividendo';
  if (e.startsWith('JUR') || e.startsWith('JSCP') || e.startsWith('JCP')) return 'jcp';
  if (e.startsWith('REND')) return 'rendimento';
  return 'dividendo';
}
function parseValor(s) {
  return Number(String(s).replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
}
function parseData(s) {
  const m = String(s).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

function parseRico(raw) {
  const linhas = raw.split(/[\n\t]/).map((l) => l.trim()).filter(Boolean);
  const registros = [];
  let atual = [];
  let secao = 'acoes';
  let secaoReg = 'acoes';
  for (const l of linhas) {
    const low = l.toLowerCase();
    if (low.includes('renda variável') || low.includes('renda variavel')) { secao = 'acoes'; continue; }
    if (low.includes('fundos imobili') || low.includes('fundos listados')) { secao = 'fiis'; continue; }
    if (ehNoise(l)) continue;
    if (l === '-') {
      if (atual.length) registros.push({ campos: atual, secao: secaoReg });
      atual = [];
      secaoReg = secao;
    } else {
      atual.push(l);
    }
  }
  if (atual.length) registros.push({ campos: atual, secao: secaoReg });

  const out = [];
  for (const r of registros) {
    if (r.campos.length < 7) continue;
    const [ticker, qtd, , bruto, liquido, evento, data] = r.campos;
    const pay_date = parseData(data);
    if (!pay_date) continue;
    out.push({
      ticker: ticker.toUpperCase(),
      quantity: Number(qtd) || null,
      kind: normKind(evento),
      amount_gross: parseValor(bruto),
      amount: parseValor(liquido),
      pay_date,
      classe: r.secao,
    });
  }
  return out;
}

const kindLabel = { dividendo: 'Dividendo', jcp: 'JCP', rendimento: 'Rendimento' };
const fmt = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtData = (iso) => iso.split('-').reverse().join('/');

export default function FormDividendos({ totalAtual, qtdAtual, acoesAtual = 0, fiisAtual = 0 }) {
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState(null);
  const [msg, setMsg] = useState('');

  const itens = texto.trim() ? parseRico(texto) : [];
  const total = itens.reduce((s, p) => s + p.amount, 0);
  const totalFiis = itens.filter((p) => p.classe === 'fiis').reduce((s, p) => s + p.amount, 0);
  const totalAcoes = total - totalFiis;

  async function confirmar() {
    setEstado('enviando');
    setMsg('');
    const res = await fetch('/api/dividends-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itens }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      setEstado('ok');
      setMsg(`Lista atualizada: ${data.quantidade} proventos, total ${fmt(data.total)}.`);
      setTexto('');
    } else {
      setEstado('erro');
      setMsg(data.erro || 'Não foi possível salvar.');
    }
  }

  return (
    <div>
      <div className="card" style={{ padding: '16px 20px', marginBottom: 16, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 3 }}>Hoje no sistema</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20 }}>{fmt(totalAtual)}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{qtdAtual} proventos · ações {fmt(acoesAtual)} · fiis {fmt(fiisAtual)}</div>
        </div>
      </div>

      <div className="card" style={{ padding: '20px 22px' }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 8 }}>
          Cole aqui a lista de proventos a receber da Rico (Ações e FIIs, pode colar tudo junto)
        </label>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Cole aqui…"
          style={{
            width: '100%', minHeight: 160, padding: '12px', borderRadius: 9, border: '1px solid var(--line)',
            fontSize: 13, fontFamily: 'ui-monospace, monospace', boxSizing: 'border-box', resize: 'vertical',
          }}
        />

        {itens.length > 0 && (
          <>
            <div style={{
              margin: '16px 0 10px', padding: '12px 14px', borderRadius: 10, background: 'var(--up-bg)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                Li <b>{itens.length}</b> proventos · ações {fmt(totalAcoes)} · fiis {fmt(totalFiis)}
              </span>
              <b style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--up)' }}>{fmt(total)}</b>
            </div>

            <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--line-soft)', borderRadius: 9 }}>
              {itens.map((p, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
                  borderBottom: '1px solid var(--line-soft)', fontSize: 13,
                }}>
                  <b style={{ fontFamily: 'var(--font-display)', minWidth: 62 }}>{p.ticker}</b>
                  <span style={{ color: 'var(--ink-faint)', minWidth: 78 }}>{kindLabel[p.kind]}</span>
                  <span style={{ color: 'var(--ink-faint)' }}>{fmtData(p.pay_date)}</span>
                  <b style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)' }}>{fmt(p.amount)}</b>
                </div>
              ))}
            </div>

            <button onClick={confirmar} disabled={estado === 'enviando'} style={{
              width: '100%', marginTop: 16, padding: '12px', borderRadius: 9, border: 0, cursor: 'pointer',
              background: 'var(--forest)', color: '#fff', fontSize: 14, fontWeight: 600,
            }}>{estado === 'enviando' ? 'Salvando…' : `Substituir lista pelos ${itens.length} proventos acima`}</button>
          </>
        )}

        {msg && (
          <p style={{ marginTop: 12, fontSize: 13, fontWeight: 500, color: estado === 'ok' ? 'var(--up)' : 'var(--down)' }}>{msg}</p>
        )}
      </div>
    </div>
  );
}
