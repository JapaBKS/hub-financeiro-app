'use client';
import { useState } from 'react';

const fmt = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function parseValor(s) {
  if (!s) return 0;
  const limpo = String(s).replace(/r\$/i, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(limpo);
  return isNaN(n) ? 0 : n;
}
function parseData(s) {
  const m = String(s).trim().match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const iso = String(s).trim().match(/(\d{4})-(\d{2})-(\d{2})/);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
}
function parseB(s) {
  const l = (s || '').trim().toLowerCase();
  return l === 'true' || l === 'sim' || l === 'pago' || l === 'v' || l === '1' || l === 'x';
}
function parseTipo(s) {
  const l = (s || '').trim().toLowerCase();
  return l.startsWith('entr') || l.includes('receita') || l === '+' ? 'entrada' : 'saida';
}

// Colunas esperadas: Data | Detalhes | Categoria | Custo | Pago | Entrada/Saída
function parse(raw) {
  const linhas = raw.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.trim());
  const out = [];
  for (const linha of linhas) {
    if (/data/i.test(linha) && /(custo|valor|categoria)/i.test(linha)) continue; // cabeçalho
    const cols = linha.split('\t').map((c) => c.trim());
    if (cols.length < 4) continue;
    const entry_date = parseData(cols[0]);
    if (!entry_date) continue;
    const details = cols[1] || '';
    const category = cols[2] || 'Outros';
    const amount = parseValor(cols[3]);
    const paid = cols.length >= 5 ? parseB(cols[4]) : true;
    const kind = cols.length >= 6 ? parseTipo(cols[5]) : 'saida';
    if (!amount) continue;
    out.push({ entry_date, details, category, amount, paid, kind });
  }
  return out;
}


export default function ImportarCaixa() {
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState(null);
  const [msg, setMsg] = useState('');

  const itens = parse(texto);
  const entradas = itens.filter((i) => i.kind === 'entrada').reduce((s, i) => s + i.amount, 0);
  const saidas = itens.filter((i) => i.kind === 'saida').reduce((s, i) => s + i.amount, 0);

  async function importar() {
    setEstado('enviando'); setMsg('');
    const res = await fetch('/api/cashbook-import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itens }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      setEstado('ok'); setMsg(`${data.inseridos} lançamentos adicionados · ${data.ignorados} já existiam.`);
      setTimeout(() => window.location.reload(), 1100);
    } else { setEstado('erro'); setMsg(data.erro || 'Não foi possível importar.'); }
  }

  return (
    <section className="card" style={{ marginTop: 16, padding: '4px 0 18px' }}>
      <div className="card-h"><h2>Importar planilha</h2></div>
      <div style={{ padding: '8px 20px 0' }}>
        <p style={{ fontSize: 12, color: 'var(--ink-faint)', margin: '0 0 8px' }}>
          Cole as linhas da planilha (com o cabeçalho). Colunas: Data · Detalhes · Categoria · Custo · Pago · Entrada/Saída. Só entra o que ainda não existe.
        </p>
        <textarea className="campo campo-colagem" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Data&#9;Detalhes da despesa&#9;Categoria&#9;Custo&#9;Pago&#9;Entrada/Saída" />
        {itens.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, padding: '10px 14px', borderRadius: 9, background: 'var(--up-bg)' }}>
            <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Li <b>{itens.length}</b> lançamentos</span>
            <span style={{ fontSize: 12.5 }}><span style={{ color: 'var(--up)' }}>+{fmt(entradas)}</span> · <span style={{ color: 'var(--down)' }}>−{fmt(saidas)}</span></span>
          </div>
        )}
        <button onClick={importar} disabled={estado === 'enviando' || itens.length === 0} style={{ width: '100%', marginTop: 12, padding: 12, borderRadius: 9, border: 0, cursor: itens.length ? 'pointer' : 'not-allowed', background: itens.length ? 'var(--forest)' : 'var(--line)', color: '#fff', fontSize: 14, fontWeight: 600 }}>{estado === 'enviando' ? 'Importando…' : 'Importar não-duplicados'}</button>
        {msg && <p style={{ marginTop: 10, fontSize: 13, fontWeight: 500, color: estado === 'ok' ? 'var(--up)' : 'var(--down)' }}>{msg}</p>}
      </div>
    </section>
  );
}
