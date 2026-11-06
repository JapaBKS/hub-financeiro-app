'use client';

// Aparece quando uma tela quebra ao carregar (ex.: o banco não respondeu).
export default function Error({ error, reset }) {
  return (
    <div className="wrap" style={{ maxWidth: 560 }}>
      <section className="card" style={{ padding: '24px 22px', marginTop: 12 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, margin: '0 0 6px' }}>Não foi possível carregar esta tela</h2>
        <p style={{ fontSize: 14, color: 'var(--ink-soft)', margin: '0 0 16px' }}>
          {error?.message || 'Erro inesperado.'} Tente de novo; se continuar, confira se o Supabase está no ar.
        </p>
        <button type="button" className="btn btn-primario" onClick={() => reset()}>Tentar de novo</button>
      </section>
    </div>
  );
}
