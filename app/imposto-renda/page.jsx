import { redirect } from 'next/navigation';

// tela antiga: agora é a aba "Declaração anual" de Impostos
export default function ImpostoRenda({ searchParams }) {
  redirect(searchParams?.ano ? `/impostos?aba=anual&ano=${searchParams.ano}` : '/impostos?aba=anual');
}
