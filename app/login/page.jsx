'use client';
import Logo from '../ui/logo';
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
    <div className="login">
      <form onSubmit={entrar} className="login-cartao">
        <Logo tamanho={56} style={{ marginBottom: 16 }} />
        <h1>Hub Financeiro</h1>
        <p>Digite a senha para entrar.</p>
        <label htmlFor="senha" className="login-rotulo">Senha</label>
        <input id="senha" className="campo" type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
          autoFocus autoComplete="current-password" aria-invalid={erro || undefined} />
        {erro && <p className="login-erro" role="alert">Senha incorreta. Tente de novo.</p>}
        <button type="submit" disabled={carregando || !senha} className="btn btn-primario btn-lg btn-cheio" style={{ marginTop: 14 }}>
          {carregando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
