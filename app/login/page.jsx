'use client';
import { useState } from 'react';

export default function Login() {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setCarregando(true);
    setErro(false);
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      // pai vai direto pro Caixa; dono pro painel
      window.location.href = data.role === 'pai' ? '/caixa' : '/';
    } else {
      setErro(true);
      setCarregando(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px', background: 'var(--paper)' }}>
      <form onSubmit={entrar} style={{
        background: 'var(--card)', padding: '28px 24px', borderRadius: 16, width: 'min(360px, 100%)',
        boxShadow: 'var(--shadow)', fontFamily: 'var(--font-body)',
      }}>
        <div className="mark" style={{ marginBottom: 14 }} />
        <h1 style={{ fontSize: 20, margin: '0 0 4px', color: 'var(--ink)' }}>Hub Financeiro</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-faint)', margin: '0 0 20px' }}>Digite a senha para entrar.</p>
        <input
          type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
          placeholder="Senha" autoFocus
          style={{
            width: '100%', padding: '13px', borderRadius: 9, border: '1px solid var(--line)',
            fontSize: 16, boxSizing: 'border-box', marginBottom: 12, background: 'var(--surface)', color: 'var(--ink)',
          }}
        />
        {erro && <p style={{ color: 'var(--down)', fontSize: 12, margin: '0 0 12px' }}>Senha incorreta.</p>}
        <button type="submit" disabled={carregando} style={{
          width: '100%', padding: '13px', borderRadius: 9, border: 0, cursor: 'pointer',
          background: 'var(--forest)', color: '#fff', fontSize: 15, fontWeight: 600,
        }}>{carregando ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  );
}
