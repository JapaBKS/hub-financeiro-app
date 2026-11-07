import './globals.css';
import Nav from './nav';

export const metadata = {
  title: 'Hub Financeiro',
  description: 'Patrimônio, carteira, cartões e caixa num lugar só',
  // instalado no iPhone/Android: abre sem a barra do navegador
  appleWebApp: { capable: true, title: 'Hub', statusBarStyle: 'black-translucent' },
  icons: { apple: '/icones/apple-touch-icon.png' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0F3B4C',
  viewportFit: 'cover', // app instalado no iPhone: ocupa a tela toda (topo respeita o entalhe)
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('tema')==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}` }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="shell">
          <Nav />
          <main className="shell-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
