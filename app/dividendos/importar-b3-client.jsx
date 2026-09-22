'use client';
import { useState } from 'react';

import { brl as fmt } from '../../lib/format';

function parseValor(s) {
  if (!s) return 0;
  const limpo = String(s).replace(/r\$/i, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(limpo);
  return isNaN(n) ? 0 : n;
}
function parseData(s) {
  const m = String(s).trim().match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}
function normKind(s) {
  const l = (s || '').toLowerCase();
  if (l.includes('juros') || l.includes('jcp') || l.includes('jscp')) return 'jcp';
  if (l.includes('rendimento')) return 'rendimento';
  return 'dividendo';
}
function parseB3(raw) {
  const linhas = raw.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.trim());
  const out = [];
  for (const linha of linhas) {
    if (/produto/i.test(linha) && /pagamento/i.test(linha)) continue; // cabeçalho
    const cols = linha.split('\t').map((c) => c.trim());
    if (cols.length < 7) continue;
    const produto = cols[0], pagamento = cols[1], tipo = cols[2], quantidade = cols[4], valorLiq = cols[6];
    const ticker = (produto.split(' - ')[0] || '').trim().toUpperCase();
    const paid_at = parseData(pagamento);
    if (!ticker || !paid_at) continue;
    out.push({
      ticker, paid_at, kind: normKind(tipo),
      quantity: Number(String(quantidade).replace(/\D/g, '')) || null,
      amount: parseValor(valorLiq),
    });
  }
  return out;
}


export default function ImportarB3() {
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState(null);
  const [msg, setMsg] = useState('');

  const itens = parseB3(texto);
  const total = itens.reduce((s, p) => s + p.amount, 0);

  async function importar() {
    setEstado('enviando'); setMsg('');
    const res = await fetch('/api/dividends-import', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itens }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      setEstado('ok');
      setMsg(`${data.inseridos} adicionados · ${data.ignorados} já existiam.`);
      setTimeout(() => window.location.reload(), 1100);
    } else {
      setEstado('erro');
      setMsg(data.erro || 'Não foi possível importar.');
    }
  }

  return (
    <section className="card" style={{ marginTop: 16, padding: '4px 0 18px' }}>
      <div className="card-h"><h2>Importar recebidos da B3</h2></div>
      <div style={{ padding: '8px 20px 0' }}>
        <p style={{ fontSize: 12, color: 'var(--ink-faint)', margin: '0 0 8px' }}>
          Cole o relatório de proventos recebidos copiado do site da B3 (com o cabeçalho). Só entra o que ainda não existe.
        </p>
        <textarea className="campo campo-colagem" value={texto} onChange={(e) => setTexto(e.target.value)}
          placeholder="Produto&#9;Pagamento&#9;Tipo de Evento&#9;Instituição&#9;Quantidade&#9;Preço unitário&#9;Valor líquido" />

        {itens.length > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: 10, padding: '10px 14px', borderRadius: 9, background: 'var(--up-bg)',
          }}>
            <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Li <b>{itens.length}</b> proventos</span>
            <b style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--up)' }}>{fmt(total)}</b>
          </div>
        )}

        <button onClick={importar} disabled={estado === 'enviando' || itens.length === 0} style={{
          width: '100%', marginTop: 12, padding: '12px', borderRadius: 9, border: 0,
          cursor: itens.length ? 'pointer' : 'not-allowed',
          background: itens.length ? 'var(--forest)' : 'var(--line)', color: '#fff', fontSize: 14, fontWeight: 600,
        }}>{estado === 'enviando' ? 'Importando…' : 'Importar não-duplicados'}</button>

        {msg && <p style={{ marginTop: 10, fontSize: 13, fontWeight: 500, color: estado === 'ok' ? 'var(--up)' : 'var(--down)' }}>{msg}</p>}
      </div>
    </section>
  );
}
