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
    if (res.ok) {
      window.location.href = '/';
    } else {
      setErro(true);
      setCarregando(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#EBEEE8' }}>
      <form onSubmit={entrar} style={{
        background: 'var(--surface)', padding: '32px', borderRadius: 16, width: 320,
        boxShadow: '0 8px 24px -12px rgba(21,37,29,.2)', fontFamily: 'system-ui',
      }}>
        <h1 style={{ fontSize: 18, margin: '0 0 4px', color: '#15251D' }}>Hub Financeiro</h1>
        <p style={{ fontSize: 13, color: '#8B978F', margin: '0 0 20px' }}>Digite a senha para entrar.</p>
        <input
          type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
          placeholder="Senha" autoFocus
          style={{
            width: '100%', padding: '11px 13px', borderRadius: 9, border: '1px solid #E1E5DD',
            fontSize: 14, boxSizing: 'border-box', marginBottom: 12,
          }}
        />
        {erro && <p style={{ color: '#BB4A3B', fontSize: 12, margin: '0 0 12px' }}>Senha incorreta.</p>}
        <button type="submit" disabled={carregando} style={{
          width: '100%', padding: '11px', borderRadius: 9, border: 0, cursor: 'pointer',
          background: '#163D30', color: '#fff', fontSize: 14, fontWeight: 600,
        }}>{carregando ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  );
}
