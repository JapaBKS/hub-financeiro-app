'use client';
import { useState } from 'react';

const fmt = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const MESES = { janeiro: 1, fevereiro: 2, marco: 3, 'março': 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12 };

function parseValor(s) {
  if (!s) return 0;
  const l = String(s).replace(/r\$/i, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(l);
  return isNaN(n) ? 0 : n;
}
function parseDataExtenso(linha) {
  const m = linha.trim().match(/^(\d{1,2})\s+de\s+([a-zç]+)\s+de\s+(\d{4})$/i);
  if (!m) return null;
  const mes = MESES[m[2].toLowerCase()];
  if (!mes) return null;
  return `${m[3]}-${String(mes).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
}
function limpaTicker(tk, mercado) {
  const t = (tk || '').toUpperCase().trim();
  if (/racion/i.test(mercado || '') && /^[A-Z]{4}\d{1,2}F$/.test(t)) return t.slice(0, -1);
  return t;
}

// Extrato de negociação da B3: blocos por data ("2 de julho de 2026"),
// cada linha começando com Compra/Venda.
function parseNegociacoes(raw) {
  const linhas = raw.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.trim());
  const out = [];
  let dataAtual = null;
  for (const linha of linhas) {
    const d = parseDataExtenso(linha);
    if (d) { dataAtual = d; continue; }
    if (/^total\s+compra/i.test(linha.trim())) continue;
    if (/movimenta/i.test(linha) && /quantidade/i.test(linha)) continue;

    const t = linha.trim();
    if (!/^(compra|venda)\b/i.test(t) || !dataAtual) continue;

    const cols = t.split('\t').map((c) => c.trim()).filter((c) => c !== '');
    const side = /^compra/i.test(t) ? 'compra' : 'venda';
    const mercado = cols[1] || '';
    const tkCol = cols.find((c) => /^[A-Z][A-Z0-9]{3,5}$/.test(c) && /\d/.test(c));
    const ticker = limpaTicker(tkCol, mercado);
    const rs = t.match(/R\$\s*[\d.]+,\d{2}/g) || [];
    const preco = rs.length >= 2 ? parseValor(rs[rs.length - 2]) : 0;
    const total = rs.length >= 1 ? parseValor(rs[rs.length - 1]) : 0;
    const qtdCol = cols.find((c) => /^\d+$/.test(c));
    const qtd = qtdCol ? Number(qtdCol) : 0;

    if (!ticker || !qtd || !preco) continue;
    out.push({ ticker, traded_at: dataAtual, side, quantity: qtd, price: preco, total });
  }
  return out;
}

const ta = {
  width: '100%', minHeight: 120, padding: '10px 12px', borderRadius: 9, border: '1px solid var(--line)',
  fontSize: 12.5, fontFamily: 'monospace', boxSizing: 'border-box', background: 'var(--surface)',
  color: 'var(--ink)', resize: 'vertical',
};

export default function ImportarNegociacoesB3() {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState(null);
  const [msg, setMsg] = useState('');

  const itens = parseNegociacoes(texto);
  const compras = itens.filter((i) => i.side === 'compra');
  const vendas = itens.filter((i) => i.side === 'venda');
  const totalC = compras.reduce((s, i) => s + i.total, 0);
  const totalV = vendas.reduce((s, i) => s + i.total, 0);

  async function importar() {
    setEstado('enviando'); setMsg('');
    const res = await fetch('/api/trades-import', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itens }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      setEstado('ok');
      const extra = data.desconhecidos?.length ? ` · não cadastrados: ${data.desconhecidos.join(', ')}` : '';
      setMsg(`${data.inseridas} importada(s) · ${data.ignoradas} já existiam${extra}`);
      setTimeout(() => window.location.reload(), 1400);
    } else {
      setEstado('erro');
      setMsg(data.erro || 'Não foi possível importar.');
    }
  }

  if (!aberto) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={() => setAberto(true)} style={{
          padding: '8px 14px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600,
          border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink-soft)',
        }}>⤒ importar da B3</button>
      </div>
    );
  }

  return (
    <section className="card" style={{ marginBottom: 14, padding: '4px 0 16px' }}>
      <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2>Importar negociações da B3</h2>
        <button onClick={() => setAberto(false)} style={{
          border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 12,
        }}>fechar</button>
      </div>
      <div style={{ padding: '8px 20px 0' }}>
        <p style={{ fontSize: 12, color: 'var(--ink-faint)', margin: '0 0 8px' }}>
          Cole o extrato de negociação da B3 (com as datas). O sufixo “F” do fracionário é removido
          automaticamente. Nada é duplicado: o que já existe é ignorado.
        </p>
        <textarea style={ta} value={texto} onChange={(e) => setTexto(e.target.value)}
          placeholder={'2 de julho de 2026\nCompra\tMercado Fracionário\t-\tXP...\tALOS3F\t28\tR$ 27,97\tR$ 783,16'} />

        {itens.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--ink-soft)' }}>
            <b>{itens.length}</b> negociações ·{' '}
            <b style={{ color: 'var(--down)' }}>{compras.length} compras {fmt(totalC)}</b> ·{' '}
            <b style={{ color: 'var(--up)' }}>{vendas.length} vendas {fmt(totalV)}</b>
            <div style={{ maxHeight: 180, overflowY: 'auto', marginTop: 8, border: '1px solid var(--line-soft)', borderRadius: 8 }}>
              {itens.map((i, k) => (
                <div key={k} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '5px 9px', fontSize: 11.5, borderBottom: k < itens.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                  <span style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-display)', minWidth: 68 }}>
                    {i.traded_at.split('-').reverse().join('/')}
                  </span>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: i.side === 'compra' ? 'var(--down)' : 'var(--up)', minWidth: 44 }}>
                    {i.side === 'compra' ? 'COMPRA' : 'VENDA'}
                  </span>
                  <b style={{ fontFamily: 'var(--font-display)', minWidth: 58 }}>{i.ticker}</b>
                  <span style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-display)' }}>{i.quantity} × {fmt(i.price)}</span>
                  <b style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)' }}>{fmt(i.total)}</b>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={importar} disabled={estado === 'enviando' || itens.length === 0} style={{
          marginTop: 12, padding: '10px 16px', borderRadius: 9, border: 0, cursor: 'pointer',
          background: 'var(--forest)', color: '#fff', fontSize: 13.5, fontWeight: 600,
          opacity: itens.length === 0 ? 0.5 : 1,
        }}>{estado === 'enviando' ? 'Importando…' : `Importar ${itens.length || ''}`}</button>

        {msg && <div style={{ marginTop: 10, fontSize: 12.5, color: estado === 'erro' ? 'var(--down)' : 'var(--up)' }}>{msg}</div>}
      </div>
    </section>
  );
}
