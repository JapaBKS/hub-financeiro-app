// Aparece automaticamente enquanto a próxima página é montada no servidor.
// Um arquivo só na raiz de app/ cobre todas as abas que não tiverem o seu.
export default function Loading() {
  const barra = (largura, altura = 14) => ({
    width: largura, height: altura, borderRadius: 7,
    background: 'var(--surface-2)', animation: 'pulsar 1.1s ease-in-out infinite',
  });

  return (
    <div className="wrap" style={{ maxWidth: 820 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 4px 20px' }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--surface-2)', animation: 'pulsar 1.1s ease-in-out infinite' }} />
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={barra(140, 15)} />
          <div style={barra(90, 10)} />
        </div>
      </div>

      <section className="card" style={{ padding: 22, marginBottom: 16 }}>
        <div style={{ ...barra(110, 10), marginBottom: 12 }} />
        <div style={{ ...barra(200, 26), marginBottom: 10 }} />
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <div style={barra(90, 12)} />
          <div style={barra(90, 12)} />
          <div style={barra(90, 12)} />
        </div>
      </section>

      {[0, 1, 2].map((i) => (
        <section className="card" key={i} style={{ padding: 18, marginBottom: 14 }}>
          <div style={{ ...barra(150, 13), marginBottom: 14 }} />
          {[0, 1, 2].map((j) => (
            <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0' }}>
              <div style={{ ...barra(28, 28), borderRadius: 8, flex: 'none' }} />
              <div style={{ display: 'grid', gap: 5, flex: 1 }}>
                <div style={barra('45%', 12)} />
                <div style={barra('28%', 9)} />
              </div>
              <div style={barra(74, 13)} />
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
