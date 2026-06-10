# Product

## Register

product

## Users

Garçons e atendentes de restaurantes/lanchonetes clientes da Gutty. Operam em pé, no salão ou no balcão, frequentemente com uma mão só, em ambientes barulhentos e com pressa. Dispositivos variados: celular no bolso do garçom, tablet no balcão, totem touch (PC com tela touch operado pela equipe, não autoatendimento) e desktop no caixa. O trabalho deles: anotar o pedido certo na comanda certa, rápido, sem treinar nada.

## Product Purpose

App web de anotação de pedidos (Gutty Pedidos, garcom.gutty.app.br). Substitui o app Android do terminal Cielo LIO e o sistema web PHP legado. Grava pedidos na tabela `pedidos_terminal` (status=0 = comanda aberta) do Postgres multi-tenant da Gutty; o fechamento/pagamento acontece no Caixa (outro app). Sucesso = pedido lançado na comanda certa em menos de 30 segundos, sem erro de comanda, em qualquer dispositivo.

Escopo deliberadamente excluído: pagamento, divisão de conta, impressão térmica (ficam no Caixa / hardware dedicado).

## Brand Personality

Confiável, direto, quente. A marca Gutty é laranja (#ea580c) com a logo GUTTY em shine animado (mesma identidade do Gutty Caixa). Tom de voz: português simples de balcão ("Anotar pedido", "Unir comandas"), zero jargão técnico. A interface deve parecer uma ferramenta de trabalho sólida, não um app de consumidor.

## Anti-references

- Apps de delivery de consumidor (iFood/Rappi): nada de fotos gigantes, banners, promoções ou marketing dentro do fluxo.
- PDV legado denso estilo Windows 98: nada de telas cinzas com 40 campos.
- Dashboards SaaS genéricos: este app tem UMA tarefa (lançar pedido); não ganha gráficos nem métricas.

## Design Principles

1. **A comanda é o centro de gravidade.** Toda tela deixa claro EM QUAL comanda o garçom está operando; trocar de comanda é sempre explícito, nunca acidental.
2. **Operável com o polegar, legível à distância de braço.** Alvos ≥44px, texto ≥14px, ações primárias ao alcance da mão em qualquer viewport.
3. **Mesmo fluxo em todo dispositivo.** Celular, tablet, totem e PC mudam o LAYOUT (colunas, painel lateral), nunca o fluxo nem o vocabulário.
4. **Estado nunca se perde por acidente.** Carrinho e comanda-alvo sobrevivem a navegação e queda de conexão; só zeram por ação explícita.
5. **Mostre o que aconteceu.** Toda mutação (pedido enviado, comandas unidas, merge desfeito) mostra o resultado concreto: itens, totais, diffs.

## Accessibility & Inclusion

Touch-first (totem e celular): alvos mínimos de 44×44px. Contraste WCAG AA (texto ≥4.5:1). Foco visível para teclado no desktop. `prefers-reduced-motion` respeitado (shine da logo e transições viram estáticos). Idioma único: pt-BR.
