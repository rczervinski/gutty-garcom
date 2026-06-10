# Design

Sistema visual do Gutty Pedidos (app de garçom). Registro: **product** — a interface serve a tarefa (lançar pedido), não é a marca em si. Identidade compartilhada com o Gutty Caixa.

## Theme

Claro, quente, de trabalho. Fundo neutro frio (`slate-50`) com superfícies brancas; o calor entra pelo laranja da marca e pelo header escuro `stone-900`. Sem dark mode (totens e celulares de salão operam em ambiente iluminado).

## Colors

Tokens via Tailwind (`tailwind.config.js`):

- **primary (laranja Gutty)** — escala orange do Tailwind. Base: `primary-600 #ea580c`. Usos: ações primárias, seleção, badges de comanda, FAB do carrinho, focos.
  - 50 `#fff7ed` · 100 `#ffedd5` · 200 `#fed7aa` · 300 `#fdba74` · 400 `#fb923c` · 500 `#f97316` · 600 `#ea580c` · 700 `#c2410c` · 800 `#9a3412` · 900 `#7c2d12`
- **Neutros de conteúdo**: `slate-50` (fundo), branco (cards/superfícies), `slate-200` (bordas), `slate-500` (texto secundário), `slate-800/900` (texto principal).
- **Neutros quentes**: `stone-900` (header do app, botões escuros), `stone-50` (fundo das telas de login), `stone-500/600` (texto nas telas de login).
- **Semânticos**: emerald (sucesso/"nova comanda"/ativo), rose (remover/erros), amber (obs de item, unir comandas). Cores significam a mesma coisa em todas as telas.

## Typography

- **Inter** (var `--font-inter`) — corpo, labels, botões, dados. Pesos 400/500/600/700.
- **Fustat** (var `--font-fustat`, classe `font-display`) — EXCLUSIVA da logo "GUTTY". Nunca em UI.
- Escala fixa rem (product register): textos de UI entre `text-xs` e `text-base`; títulos de tela `text-base/2xl font-semibold/bold`. Sem clamp fluido.

## Logo

"GUTTY" em Fustat extrabold tracking-tighter + feixe de luz animado:
- `.gutty-shine` — gradiente laranja, fundos claros (logins).
- `.gutty-shine-dark` — feixe claro, header escuro.
- Keyframes `logoShine` (3s ease-in-out infinite, background-position sweep). Acompanha "PEDIDOS" em uppercase tracking largo `text-primary-300/700`.

## Components

- **Cards/superfícies**: `rounded-xl`/`rounded-2xl`, `border-slate-200`, `shadow-card` (hover: `shadow-card-hover`; flutuantes: `shadow-elevated`).
- **Inputs**: `rounded-xl border-slate-300`, foco `border-primary-500 + ring-2 ring-ary-100` (logins usam `ring-4 ring-primary-500/15`). Desabilitado: `bg-slate-100 text-slate-500`.
- **Botão primário**: `bg-primary-600` (logins: gradiente `from-primary-500 to-primary-600`), texto branco bold, `active:scale-[0.99]`.
- **Botão secundário**: branco com `border-slate-300`; escuro: `bg-stone-900`.
- **Badge de comanda**: quadrado `rounded-xl bg-primary-50 text-primary-700 font-bold` com o número.
- **Bottom sheet** (ComandaPicker): overlay `bg-black/40`, painel `rounded-t-2xl` com busca.
- **Avisos de estado**: faixa `bg-primary-50 text-primary-800/900` (comanda travada/lançando), `bg-emerald-50` (nova comanda).
- **Toasts**: sonner `richColors`, topo centro.

## Motion

Curtas e funcionais (150–300ms): `animate-fade-in`, `fade-in-up` (sheets), `scale-in`; `active:scale-95/[0.99]` como feedback tátil. Shine da logo é a única animação contínua. `prefers-reduced-motion` deve neutralizar shine e entradas.

## Layout

Mobile-first com expansão estrutural por breakpoint (não tipografia fluida):

- **< md (celular)**: uma coluna, header sticky, FAB do carrinho fixo embaixo, bottom sheets.
- **md (tablet retrato)**: conteúdo até ~`max-w-2xl`, grades de 2 colunas.
- **lg+ (tablet deitado / totem / PC)**: app shell de duas regiões — conteúdo principal (cardápio em grade `repeat(auto-fill, minmax(220px,1fr))`, listas em 2 colunas) + **painel lateral direito fixo de ~380px com o carrinho/checkout sempre visível**. O FAB some; o fluxo não muda, só o layout.
- Touch targets ≥44px em todos os breakpoints (totem é touch).
- Safe areas iOS: util `.safe-bottom`.
