'use client';
import { useState } from 'react';
import { Campo } from '../ui/campos';
import { Botao } from '../ui/botoes';

const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function MetasClasse({ classes }) {
  const [vals, setVals] = useState(() => {
    const o = {};
    classes.forEach((c) => { o[c.id] = (Number(c.target_pct) * 100).toFixed(2); });
    return o;
  });
  const [fixos, setFixos] = useState(() => {
    const o = {};
    classes.forEach((c) => { o[c.id] = c.alvo_valor != null ? String(c.alvo_valor) : ''; });
    return o;
  });
  const [fora, setFora] = useState(() => {
    const o = {};
    classes.forEach((c) => { o[c.id] = !!c.fora_rateio; });
    return o;
  });
  const [estado, setEstado] = useState(null);
  const [msg, setMsg] = useState('');

  const ehFixo = (id) => String(fixos[id] || '').trim() !== '' && Number(fixos[id]) > 0;
  // só as classes SEM valor fixo disputam os 100%
  const foraDoRateio = (id) => ehFixo(id) || !!fora[id];
  const total = classes.reduce((s, c) => s + (foraDoRateio(c.id) ? 0 : (Number(vals[c.id]) || 0)), 0);
  const cem = Math.abs(total - 100) < 0.05;

  async function salvar() {
    setEstado('enviando'); setMsg('');
    const targets = classes.map((c) => ({
      id: c.id,
      target_pct: foraDoRateio(c.id) ? 0 : (Number(vals[c.id]) || 0) / 100,
      alvo_valor: ehFixo(c.id) ? Number(fixos[c.id]) : null,
      fora_rateio: !!fora[c.id],
    }));
    const res = await fetch('/api/class-targets', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targets }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) { setEstado('ok'); setMsg('Metas salvas! Recarregue para ver nas recomendações.'); }
    else { setEstado('erro'); setMsg(data.erro || 'Não foi possível salvar.'); }
  }

  return (
    <section className="card" style={{ marginBottom: 16, padding: '4px 0 16px' }}>
      <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2>Metas por classe</h2>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: cem ? 'var(--up)' : 'var(--amber)' }}>
          soma {total.toFixed(2).replace('.', ',')}%
        </span>
      </div>

      <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', margin: '4px 20px 0' }}>
        Preencha <b>%</b> para classes que disputam a carteira, ou <b>valor fixo</b> (ex.: reserva de emergência).
        Quem tem valor fixo sai do rateio dos 100%.
      </p>

      <div style={{ marginTop: 8 }}>
        {/* cabeçalho das colunas (só no desktop; no celular cada campo já tem o seu rótulo) */}
        <div className="meta-classe meta-classe-cab" aria-hidden="true">
          <span>Classe</span>
          <span>Meta %</span>
          <span style={{ textAlign: 'center' }}>Fora</span>
          <span>Valor fixo</span>
        </div>
        {classes.map((c) => {
          const fixo = ehFixo(c.id);
          const off = foraDoRateio(c.id);
          return (
            <div key={c.id} className="meta-classe">
              <span className="c-nome" style={{ fontSize: 13.5, fontWeight: 500 }}>{c.name}</span>
              <div className="c-campo c-pct" style={{ opacity: off ? 0.4 : 1 }}>
                <Campo tamanho="sm" numerico largura="100%" type="number" step="any" min="0"
                  value={vals[c.id]} disabled={off}
                  onChange={(e) => setVals((v) => ({ ...v, [c.id]: e.target.value }))} />
                <span style={{ fontSize: 13, color: 'var(--ink-faint)' }}>%</span>
              </div>
              <label className="c-fora" title="fora do rateio: não disputa os 100% (ex.: dinheiro a investir)"
                style={{ color: fora[c.id] ? 'var(--forest-2)' : 'var(--ink-faint)' }}>
                <input type="checkbox" checked={!!fora[c.id]} style={{ margin: 0 }}
                  onChange={() => setFora((f) => ({ ...f, [c.id]: !f[c.id] }))} />
                fora
              </label>
              <div className="c-campo c-fixo">
                <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>R$</span>
                <Campo tamanho="sm" numerico largura="100%"
                  style={fixo ? { borderColor: 'var(--forest-2)' } : undefined}
                  type="number" step="any" min="0" placeholder="fixo" value={fixos[c.id]}
                  onChange={(e) => setFixos((f) => ({ ...f, [c.id]: e.target.value }))} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '0 20px' }}>
        {!cem && (
          <p style={{ fontSize: 12, color: 'var(--amber)', marginTop: 10 }}>
            A soma das classes em % não fecha 100% — dá pra salvar assim, mas o ideal é fechar.
          </p>
        )}
        <Botao variante="primario" tamanho="lg" cheio style={{ marginTop: 12 }}
          onClick={salvar} carregando={estado === 'enviando'}>
          Salvar metas por classe
        </Botao>
        {msg && <p style={{ marginTop: 10, fontSize: 13, fontWeight: 500, color: estado === 'ok' ? 'var(--up)' : 'var(--down)' }}>{msg}</p>}
      </div>
    </section>
  );
}
