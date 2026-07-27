'use client';
import { useState } from 'react';

const fmt = (n) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function parseValor(s) {
  if (!s) return 0;
  const limpo = String(s).replace(/r\$/i, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(limpo);
  return isNaN(n) ? 0 : n;
}
function parseData(s) {
  const m = String(s || '').trim().match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}
function normKind(s) {
  const l = (s || '').toLowerCase();
  if (l.includes('juros') || l.includes('jcp') || l.includes('jscp')) return 'jcp';
  if (l.includes('rendimento')) return 'rendimento';
  return 'dividendo';
}
// Aba "a receber" da B3. O texto cola quebrado em varias linhas por ativo:
//   TICKER - Nome...        (linha do ativo)
//   Tipo  data  evento
//   Instituicao
//   Qtd  R$ preco  R$ valor liquido
// Agrupamos por linha de ticker e extraimos data/evento/valor do bloco todo.
const ehLinhaTicker = (l) => /^[A-Z][A-Z0-9]{3,4}\d\b/.test(l) && l.includes('-');

function parseReceber(raw) {
  const linhas = raw.split('\n').map((l) => l.replace(/\r$/, '').replace(/\t/g, ' ').trim()).filter(Boolean);
  const registros = [];
  let atual = null;
  for (const l of linhas) {
    if (/produto/i.test(l) && /pagamento/i.test(l)) continue; // cabecalho
    if (ehLinhaTicker(l)) { if (atual) registros.push(atual); atual = [l]; }
    else if (atual) atual.push(l);
  }
  if (atual) registros.push(atual);

  const out = [];
  for (const reg of registros) {
    const texto = reg.join('  ');
    const tk = texto.match(/^([A-Z][A-Z0-9]{3,4}\d)/);
    const ticker = tk ? tk[1] : '';
    const pay_date = parseData(texto);
    if (!ticker || !pay_date) continue;
    const kindCol = (texto.match(/rendimento|juros sobre capital|jcp|jscp|dividendo/i) || [])[0];
    const rs = texto.match(/R\$\s*[\d.]+,\d{2}/g) || [];
    const amount = parseValor(rs[rs.length - 1]); // ultimo R$ = valor liquido
    const ehFundo = /fundo/i.test(texto) || /11$/.test(ticker);
    out.push({ ticker, pay_date, kind: normKind(kindCol), amount, classe: ehFundo ? 'fiis' : 'acoes' });
  }
  return out;
}

const ta = {
  width: '100%', minHeight: 110, padding: '10px 12px', borderRadius: 9, border: '1px solid var(--line)',
  fontSize: 12.5, fontFamily: 'monospace', boxSizing: 'border-box', background: 'var(--surface)', color: 'var(--ink)', resize: 'vertical',
};

export default function ImportarB3Receber() {
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState(null);
  const [msg, setMsg] = useState('');

  const itens = parseReceber(texto);
  const total = itens.reduce((s, p) => s + p.amount, 0);

  async function importar() {
    setEstado('enviando'); setMsg('');
    const res = await fetch('/api/dividends-pending-import', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itens }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      setEstado('ok');
      setMsg(`${data.inseridos} proventos importados (substituiu os "a receber" anteriores).`);
      setTimeout(() => window.location.reload(), 1100);
    } else {
      setEstado('erro');
      setMsg(data.erro || 'Não foi possível importar.');
    }
  }

  return (
    <section className="card" style={{ marginTop: 16, padding: '4px 0 18px' }}>
      <div className="card-h"><h2>Importar a receber da B3</h2></div>
      <div style={{ padding: '8px 20px 0' }}>
        <p style={{ fontSize: 12, color: 'var(--ink-faint)', margin: '0 0 8px' }}>
          Cole a aba “a receber” COMPLETA copiada do site da B3 (com o cabeçalho). A B3 é a fonte da verdade: isto substitui todos os “a receber” pelos da B3 (os já recebidos não são afetados).
        </p>
        <textarea style={ta} value={texto} onChange={(e) => setTexto(e.target.value)}
          placeholder="Produto&#9;Tipo&#9;Previsão de Pagamento&#9;Tipo de Evento&#9;Instituição&#9;Quantidade&#9;Preço Unitário&#9;Valor Líquido" />

        {itens.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--ink-soft)' }}>
            Detectados <b>{itens.length}</b> proventos · total <b style={{ fontFamily: 'var(--font-display)', color: 'var(--up)' }}>{fmt(total)}</b>
          </div>
        )}

        <button onClick={importar} disabled={estado === 'enviando' || itens.length === 0} style={{
          marginTop: 12, padding: '10px 16px', borderRadius: 9, border: 0, cursor: 'pointer',
          background: 'var(--forest)', color: '#fff', fontSize: 13.5, fontWeight: 600,
          opacity: itens.length === 0 ? 0.5 : 1,
        }}>{estado === 'enviando' ? 'Importando…' : 'Importar a receber'}</button>

        {msg && <div style={{ marginTop: 10, fontSize: 12.5, color: estado === 'erro' ? 'var(--down)' : 'var(--up)' }}>{msg}</div>}
      </div>
    </section>
  );
}
