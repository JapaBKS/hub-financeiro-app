'use client';
import { useState } from 'react';
import { brl, pct } from '../../lib/format';
import FormNegociacao from '../negociacoes/form-client';
import PrecoManual from '../preco-manual-client';

export default function RecomendacoesLista({ comprar, reduzir, manterN, novasN, municao = 0, reservaAporte = 0, tol, assets, classes }) {
  const [preset, setPreset] = useState(null);
  const [abertoTicker, setAbertoTicker] = useState(null); // abre inline sob a linha
  const [aberto, setAberto] = useState(false);            // form avulso no rodapé

  function usarRecomendacao(i) {
    if (i.reserva) return; // reserva não é negociação: o saldo se edita em Saldos manuais
    if (abertoTicker === i.ticker) { setAbertoTicker(null); return; } // clicar de novo fecha
    setPreset({
      ticker: i.ticker,
      side: i.acao === 'reduzir' ? 'venda' : 'compra',
      quantity: i.qtd != null && i.qtd > 0 ? (i.inteiro ? i.qtd : Number(i.qtd.toFixed(6))) : '',
      price: i.precoUnit > 0 ? Number(i.precoUnit.toFixed(2)) : '',
      _t: Date.now(),
    });
    setAbertoTicker(i.ticker);
    setAberto(false);
  }

  const linhaRec = (i) => (
    <div onClick={() => usarRecomendacao(i)} title="clique para registrar esta negociação"
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', cursor: 'pointer',
        borderBottom: '1px solid var(--line-soft)',
        borderLeft: i.nova ? '3px solid var(--up)' : i.atencao ? '3px solid var(--amber)' : '3px solid transparent',
        background: abertoTicker === i.ticker ? 'var(--surface-2)' : i.nova ? 'var(--up-bg)' : 'transparent',
      }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8, flex: 'none', display: 'grid', placeItems: 'center',
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
        background: i.tom === 'buy' ? 'var(--up-bg)' : i.tom === 'sell' ? 'var(--down-bg)' : 'var(--surface-2)',
        color: i.tom === 'buy' ? 'var(--up)' : i.tom === 'sell' ? 'var(--down)' : 'var(--ink-faint)',
      }}>{i.tom === 'buy' ? 'C' : i.tom === 'sell' ? 'V' : '–'}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
          <b style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>{i.ticker}</b>
          {i.nova && (
            <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.04em', color: '#fff', background: 'var(--up)', borderRadius: 4, padding: '1px 6px' }}>NOVA</span>
          )}
          <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{i.classe}</span>
        </div>
        <div style={{ fontSize: 12, marginTop: 2, color: i.atencao ? 'var(--amber)' : 'var(--ink-soft)' }}>
          {i.atencao ? '⚠ ' : ''}{i.motivo}
        </div>
        {i.held && (i.aReceber || (i.padraoPagamento && i.padraoPagamento.tipo !== 'irregular')) && (
          <div style={{ fontSize: 10.5, marginTop: 3, color: 'var(--brass)' }}>
            {i.aReceber
              ? `paga ${i.aReceber.dia.split('-').reverse().slice(0, 2).join('/')} · ${brl(i.aReceber.valor)}`
              : `paga ${i.padraoPagamento.descricao}`}
          </div>
        )}
        {i.held && i.p && (
          <div style={{ fontSize: 11.5, marginTop: 3, color: 'var(--ink-faint)', fontFamily: 'var(--font-display)' }}>
            PM {brl(Number(i.p.preco_medio))}
            {i.precoUnit > 0 && (
              <>
                {' · agora '}{brl(i.precoUnit)}
                {i.origemPreco === 'manual' && (
                  <span title="preço informado por você" style={{ color: 'var(--forest-2)' }}> (manual)</span>
                )}
                {i.origemPreco === 'auto-velho' && (
                  <span title="cotação desatualizada" style={{ color: 'var(--amber)' }}> (antiga)</span>
                )}
                {i.desconto != null && (
                  <b style={{ color: i.desconto <= 0 ? 'var(--up)' : 'var(--down)', marginLeft: 4 }}>
                    ({i.desconto > 0 ? '+' : ''}{pct(i.desconto)})
                  </b>
                )}
              </>
            )}
          </div>
        )}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: i.tom === 'buy' ? 'var(--up)' : 'var(--down)' }}>
          {i.sugestaoRs >= 0 ? 'comprar ' : 'reduzir '}{brl(Math.abs(i.sugestaoRs))}
        </div>
        {!i.reserva && (i.acao === 'comprar' || i.acao === 'reduzir') && (
          i.precoUnit > 0 ? (
            <div style={{ fontSize: 11, marginTop: 2, color: i.umaCotaPassa ? 'var(--amber)' : 'var(--ink-faint)' }}>
              {i.umaCotaPassa
                ? `1 cota = ${brl(i.precoUnit)} (acima do ajuste)`
                : i.inteiro
                  ? `≈ ${i.qtd} cota${i.qtd === 1 ? '' : 's'} a ${brl(i.precoUnit)}`
                  : `≈ ${i.qtd.toLocaleString('pt-BR', { maximumFractionDigits: 6 })} un.`}
              {i.precoVelho && (
                <span title="cotação desatualizada — confira o preço antes de executar" style={{ color: 'var(--amber)' }}> ⚠</span>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 11, marginTop: 3 }} onClick={(e) => e.stopPropagation()}>
              <PrecoManual ticker={i.ticker} valor={i.precoManual} />
            </div>
          )
        )}
        {i.buraco != null && (
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>
            faltam {brl(i.buraco)} até o alvo
          </div>
        )}
        {!i.reserva && (
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>
            {pct(i.pesoReal)} de {pct(i.target)}
          </div>
        )}
      </div>
    </div>
  );

  const linhaComForm = (i) => (
    <div key={i.ticker}>
      {linhaRec(i)}
      {abertoTicker === i.ticker && (
        <div style={{ padding: '4px 16px 16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line-soft)' }}>
          <FormNegociacao assets={assets} classes={classes} preset={preset} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
            <button onClick={() => setAbertoTicker(null)} style={{
              padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink-soft)',
            }}>fechar</button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <section className="card" style={{ marginBottom: 16 }}>
        <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2>Comprar ({comprar.length})</h2>
          {novasN > 0 && <span style={{ fontSize: 12, color: 'var(--up)', fontWeight: 600 }}>{novasN} {novasN === 1 ? 'nova' : 'novas'}</span>}
        </div>
        {municao > 0 && (
          <div style={{ padding: '8px 20px 0', fontSize: 12, color: 'var(--ink-soft)' }}>
            Distribuindo <b style={{ fontFamily: 'var(--font-display)', color: 'var(--forest-2)' }}>{brl(municao)}</b> disponíveis
            {reservaAporte > 0
              ? <>: <b>{brl(reservaAporte)}</b> para a reserva e <b>{brl(municao - reservaAporte)}</b> entre os ativos, tudo na proporção do buraco de cada um.</>
              : ' na proporção do buraco de cada ativo.'}
          </div>
        )}
        <div style={{ marginTop: 6 }}>
          {comprar.map((i) => linhaComForm(i))}
          {comprar.length === 0 && <div style={{ padding: '14px 20px', fontSize: 13, color: 'var(--ink-faint)' }}>{municao > 0 ? 'O valor disponível não paga nem 1 cota de nenhum ativo abaixo do alvo.' : 'Nada abaixo do alvo agora.'}</div>}
        </div>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="card-h"><h2>Reduzir ({reduzir.length})</h2></div>
        <div style={{ marginTop: 6 }}>
          {reduzir.map((i) => linhaComForm(i))}
          {reduzir.length === 0 && <div style={{ padding: '14px 20px', fontSize: 13, color: 'var(--ink-faint)' }}>Nenhum ativo acima do alvo.</div>}
        </div>
      </section>

      <p style={{ fontSize: 12, color: 'var(--ink-faint)', textAlign: 'center', margin: '4px 0 16px' }}>
        {manterN} ativos no alvo. ⚠ = fora da condição de preço. Tolerância {(tol * 100).toFixed(0)}%. Clique numa recomendação para registrar.
      </p>

      <div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: aberto ? 12 : 0 }}>
          <button onClick={() => setAberto((v) => !v)} style={{
            padding: '9px 16px', borderRadius: 9, cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
            border: '1px solid var(--forest)',
            background: aberto ? 'var(--surface)' : 'var(--forest)',
            color: aberto ? 'var(--forest-2)' : '#fff',
          }}>{aberto ? 'Fechar' : '+ registrar negociação'}</button>
        </div>
        {aberto && <FormNegociacao assets={assets} classes={classes} preset={preset} />}
      </div>
    </div>
  );
}
