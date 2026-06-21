import { supabaseServer } from '../../lib/supabase';
import FormCartao from './form-client';

export const dynamic = 'force-dynamic';

export default async function Cartoes() {
  const sb = supabaseServer();
  const { data: cards } = await sb.from('cards').select('id, name, due_day').order('name');

  return (
    <div className="wrap" style={{ maxWidth: 560 }}>
      <header className="topbar">
        <div className="brand">
          <div className="mark" />
          <div><b>Compra no cartão</b><span>lançamento com parcelas</span></div>
        </div>
        <a href="/" style={{ fontSize: 13, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 500 }}>← painel</a>
      </header>
      <FormCartao cards={cards || []} />
    </div>
  );
}
