import { supabaseServer } from '../../lib/supabase';
import FormDividendos from './form-client';

export const dynamic = 'force-dynamic';

export default async function Dividendos() {
  const sb = supabaseServer();
  const { data: pend } = await sb
    .from('dividends_pending')
    .select('ticker, pay_date, kind, amount')
    .order('pay_date');

  const totalAtual = (pend || []).reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="wrap" style={{ maxWidth: 680 }}>
      <header className="topbar">
        <div className="brand">
          <div className="mark" />
          <div><b>Proventos a receber</b><span>sincronizar com a Rico</span></div>
        </div>
        <a href="/" style={{ fontSize: 13, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 500 }}>← painel</a>
      </header>
      <FormDividendos totalAtual={totalAtual} qtdAtual={(pend || []).length} />
    </div>
  );
}
