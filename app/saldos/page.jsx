import { redirect } from 'next/navigation';

// tela antiga: os saldos manuais agora ficam no fim da Carteira
export default function Saldos() { redirect('/carteira#saldos'); }
