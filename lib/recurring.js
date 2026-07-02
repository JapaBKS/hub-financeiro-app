// Gera as ocorrências (datas) de uma conta recorrente num mês (YYYY-MM).
// 'dia_mes': o dia informado, empurrado p/ próximo dia útil se cair no fim de semana.
// 'semanal': todas as ocorrências daquele dia da semana dentro do mês.

function ultimoDiaDoMes(ano, mes0) { return new Date(ano, mes0 + 1, 0).getDate(); }

function ehFimDeSemana(d) { return d.getDay() === 0 || d.getDay() === 6; }

function ajustaDiaUtil(ano, mes0, dia) {
  const base = new Date(ano, mes0, dia);
  // empurra pra frente até dia útil
  let f = new Date(base);
  while (ehFimDeSemana(f)) f = new Date(f.getFullYear(), f.getMonth(), f.getDate() + 1);
  if (f.getMonth() === mes0) return f;
  // se saiu do mês, volta pro último dia útil dentro do mês
  let b = new Date(base);
  while (ehFimDeSemana(b)) b = new Date(b.getFullYear(), b.getMonth(), b.getDate() - 1);
  return b;
}

function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function ocorrenciasNoMes(bill, ym) {
  const [ano, mes] = ym.split('-').map(Number);
  const mes0 = mes - 1;
  const out = [];

  if (bill.schedule_kind === 'semanal') {
    const alvo = Number(bill.weekday); // 0=dom..6=sab
    const total = ultimoDiaDoMes(ano, mes0);
    for (let dia = 1; dia <= total; dia++) {
      const d = new Date(ano, mes0, dia);
      if (d.getDay() === alvo) out.push(iso(d));
    }
  } else {
    const diaAlvo = Math.min(Number(bill.day_of_month) || 1, ultimoDiaDoMes(ano, mes0));
    out.push(iso(ajustaDiaUtil(ano, mes0, diaAlvo)));
  }
  return out;
}
