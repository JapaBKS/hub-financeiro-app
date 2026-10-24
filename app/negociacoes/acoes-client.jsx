'use client';
import { useState } from 'react';
import FormNegociacao from './form-client';
import ImportarNegociacoesB3 from './importar-b3-client';

// Os dois atalhos lado a lado, do mesmo tamanho. Antes eram dois botões empilhados,
// alinhados à direita, com tamanhos e cores diferentes. O que está aberto fica destacado.
export default function AcoesNegociacao({ assets, classes }) {
  const [painel, setPainel] = useState(null); // 'importar' | 'registrar' | null
  const alternar = (qual) => setPainel((p) => (p === qual ? null : qual));

  return (
    <div style={{ marginBottom: 14 }}>
      <div className="acoes-dupla">
        <button type="button" onClick={() => alternar('importar')} aria-expanded={painel === 'importar'}
          className={painel === 'importar' ? 'acao-btn ativo' : 'acao-btn'}>
          <span aria-hidden="true">⤒</span> Importar da B3
        </button>
        <button type="button" onClick={() => alternar('registrar')} aria-expanded={painel === 'registrar'}
          className={painel === 'registrar' ? 'acao-btn ativo' : 'acao-btn'}>
          <span aria-hidden="true">+</span> Registrar
        </button>
      </div>

      {painel === 'importar' && (
        <ImportarNegociacoesB3 assets={assets} classes={classes} onFechar={() => setPainel(null)} />
      )}
      {painel === 'registrar' && <FormNegociacao assets={assets} classes={classes} />}
    </div>
  );
}
