// Permite instalar o site como app (ícone na tela inicial, abre em tela cheia).
export default function manifest() {
  return {
    name: 'Hub Financeiro',
    short_name: 'Hub',
    description: 'Patrimônio, carteira, cartões e caixa num lugar só',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0F3B4C',
    theme_color: '#0F3B4C',
    lang: 'pt-BR',
    icons: [
      { src: '/icones/icone-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icones/icone-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icones/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
