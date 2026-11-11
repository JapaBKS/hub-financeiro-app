'use client';
import { useState } from 'react';
import { brl, numeroBR } from '../../lib/format';

// Atualiza o saldo "A investir" (saldos manuais das classes fora do rateio) sem sair da tela.
export default function AInvestir({ saldos }) {
  const [valores, setValores] = useState(() => Object.fromEntries(saldos.map((s) => [s.id, String(s.amount).replace('.', ',')])));
  const [estado, setEstado] = useState(null);
  const total = saldos.reduce((t, s) => t + (numeroBR(valores[s.id]) || 0), 0);
  const mudou = saldos.some((s) => Math.abs((numeroBR(valores[s.id]) || 0) - Number(s.amount)) > 0.004);

  async function salvar() {
    setEstado('salvando');
    for (const s of saldos) {
      const v = numeroBR(valores[s.id]) || 0;
      if (Math.abs(v - Number(s.amount)) < 0.005) continue;
      const r = await fetch('/api/manual-holdings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, amount: v }) });
      if (!r.ok) { setEstado('erro'); return; }
    }
    setEstado('ok');
    window.location.reload();
  }

  if (!saldos.length) {
    return <p className="inv-vazio">Nenhum saldo "A investir" cadastrado. Crie um em Carteira → Saldos manuais, numa classe marcada como fora do rateio.</p>;
  }
  return (
    <div className="inv-saldo">
      {saldos.map((s) => (
        <label key={s.id}>
          <span>{s.label}</span>
          <input className="campo" inputMode="decimal" value={valores[s.id]} onChange={(e) => setValores((v) => ({ ...v, [s.id]: e.target.value }))} />
        </label>
      ))}
      <button type="button" className="btn btn-primario" disabled={!mudou || estado === 'salvando'} onClick={salvar}>
        {estado === 'salvando' ? 'Salvando…' : `Salvar ${saldos.length > 1 ? `(${brl(total)})` : ''}`}
      </button>
      {estado === 'erro' && <span className="inv-erro">Não foi possível salvar.</span>}
    </div>
  );
}
