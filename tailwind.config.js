/** @type {import('tailwindcss').Config} */
//
// As cores, fontes, raio e sombra do tema continuam definidos como variáveis CSS
// em app/globals.css (inclusive o modo escuro, via [data-theme="dark"]).
// O Tailwind só dá NOMES de classe a essas variáveis. Por isso `bg-card`,
// `text-ink-soft` ou `border-line` já trocam sozinhos entre claro e escuro,
// sem precisar de `dark:`.
//
// Exemplos:  bg-paper  bg-card  text-ink  text-ink-faint  border-line
//            text-up  bg-up-bg  text-down  text-amber  text-brass
//            font-display  font-body  rounded-card  shadow-card
//
// Limitação: com cor vinda de variável, modificadores de opacidade (bg-up/50)
// não funcionam. Para isso, crie uma variável nova em globals.css.
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
  ],
  // caso um dia use `dark:`, segue o mesmo atributo do botão de tema
  darkMode: ['selector', '[data-theme="dark"]'],
  corePlugins: {
    // O reset do Tailwind mudaria títulos, botões e margens das telas atuais.
    // Fica desligado até migrarmos as telas; globals.css já cuida da base.
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: 'var(--ink)', soft: 'var(--ink-soft)', faint: 'var(--ink-faint)' },
        paper: 'var(--paper)',
        card: 'var(--card)',
        line: { DEFAULT: 'var(--line)', soft: 'var(--line-soft)' },
        surface: { DEFAULT: 'var(--surface)', 2: 'var(--surface-2)' },
        track: 'var(--track)',
        forest: { DEFAULT: 'var(--forest)', 2: 'var(--forest-2)' },
        up: { DEFAULT: 'var(--up)', bg: 'var(--up-bg)' },
        down: { DEFAULT: 'var(--down)', bg: 'var(--down-bg)' },
        amber: { DEFAULT: 'var(--amber)', bg: 'var(--amber-bg)' },
        brass: { DEFAULT: 'var(--brass)', soft: 'var(--brass-soft)', bg: 'var(--brass-bg)' },
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
      },
      borderRadius: { card: 'var(--radius)' },
      boxShadow: { card: 'var(--shadow)' },
    },
  },
  plugins: [],
};
