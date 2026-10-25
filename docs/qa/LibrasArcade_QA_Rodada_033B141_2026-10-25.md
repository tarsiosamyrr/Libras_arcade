# Libras Arcade | QA rotulado da Fase 03.3B-1.4.1

Data da coleta: 25/10/2026. Origem: `qa-fase-033b141-letras-problematicas.json` entregue pelo usuário. Análise de **12 objetos de captura**. Os resultados foram extraídos de eventos efetivamente registrados.

**Cuidados de interpretação**

- Contagens de candidatos se referem a **frames/observações**, nunca a tentativas independentes ou precisão.
- Confirmações se referem a eventos `signconfirmed`; aceitações e erros vêm de `game_decision`.
- As capturas 4 e 11 atingiram **120 eventos**, perderam `calibration_start` e têm mão/intenção **não verificáveis no próprio objeto**. A intenção conjectural é marcada com `?` apenas pela ordem de coleta, não deve servir a ajustes geométricos.
- A mão física, orientação e espelhamento são **rótulos manuais**, não medições independentes de lateralidade feita pelo MediaPipe.
- Não contém landmarks brutos, imagens ou vídeo. Não serve para reproduzir exatamente a geometria de uma mão.

## Evidência quantitativa por janela

| Janela | Intenção | Mão declarada | Eventos no buffer | Candidatas mais frequentes | Confirmações | Aceitas / wrong_letter |
|---:|---|---|---:|---|---|---|
| 1 | R | right | 91 | R (26 frames), U (11 frames) | R: 2 | 2 / 0 |
| 2 | R | left | 51 | R (23 frames), A (3 frames), X (2 frames) | R: 2 | 2 / 0 |
| 3 | J | left | 94 | I (17 frames), A (12 frames), O (5 frames) | J: 2 | 2 / 0 |
| 4 | J? | não registrado | 120 | I (27 frames), O (7 frames), A (7 frames) | J: 2 | 2 / 0 |
| 5 | O | right | 54 | O (15 frames), X (1 frames) | O: 2 | 2 / 0 |
| 6 | O | left | 86 | A (26 frames), O (11 frames), X (2 frames) | A: 3 | 0 / 3 |
| 7 | P | right | 73 | V (19 frames), P (12 frames), A (2 frames) | V: 1, P: 1 | 1 / 1 |
| 8 | P | left | 82 | V (27 frames), W (5 frames), B (3 frames) | V: 3 | 0 / 3 |
| 9 | X | left | 68 | D (36 frames), V (1 frames), R (1 frames) | nenhuma | 0 / 0 |
| 10 | X | right | 91 | X (23 frames), D (7 frames), R (4 frames) | X: 2 | 2 / 0 |
| 11 | Y? | não registrado | 120 | I (44 frames), A (6 frames), O (2 frames) | I: 1, J: 1 | 0 / 2 |
| 12 | Y | left | 99 | I (48 frames), A (4 frames), Y (1 frames) | J: 2 | 0 / 2 |

## Achados funcionais prioritários

1. **O/A, forte variação entre mãos:** a janela O/right teve duas confirmações O aceitas; O/left teve três confirmações A rejeitadas, embora também tenha produzido candidatas O. A orientação lateral e o espelhamento ainda precisam de coleta controlada.
2. **P/V/K:** P/right teve um V incorreto e um P aceito. P/left teve três V incorretos sem P confirmado; inspecionar direção, abertura e confusão com K. Não definir `V = só para cima` como verdade linguística sem referência validada.
3. **X/D:** X/right teve duas confirmações X aceitas; X/left teve D como principal em 36 frames e nenhuma confirmação X. Inspecionar curvatura, projeção e handedness.
4. **Y/I/J:** Y/left apresentou dois J incorretos, I como principal em muitos frames, mas nenhuma Y confirmada. A janela 11, que perdeu o rótulo de início, traz I e J rejeitados com Y como alvo. Investigar empate estrutural I/Y e falsa detecção dinâmica J.
5. **R/U e divergência pedagógica:** as duas janelas R (direita e esquerda) registraram R aceito duas vezes cada. Na direita, alternâncias entre R e U reiniciaram várias vezes o hold, com margens baixas. O usuário relatou que um gesto com indicador e médio parcialmente flexionados costuma ser mais facilmente aceito que a representação com ambos esticados e cruzados. **Não alterar a forma ensinada por conveniência do classificador:** validar com referência especializada em Libras.
6. **J dinâmico:** duas confirmações J aceitas na janela rotulada J/left; outra janela longa perdeu o rótulo, mas reteve duas confirmações J. Observação manual do usuário: estabilizar a pose I imóvel antes do movimento facilita o reconhecimento; gesto lento funciona melhor. A fase 03.3B-1.4.1 não está homologada em todas as velocidades.

## Letras fora desta rodada

E, M, N, S, T foram historicamente problemáticas e precisam de capturas rotuladas para calibrar. Não declarar que foram recuperadas por ausência de evidência recente.

## Recomendações para Codex

- Confirmar código e estado Git antes de editar. Preservar J/Z, cooldown, jogo e navegação do Treino. Trabalhar somente em `fase-03-cooldown-recuperado`.
- Na fase 03.3B-2A, primeiro investigar O/A e P/V/K e melhorar diferenciação/margens apenas se os dados escalares permitirem validar ajustes **com exemplos positivos e negativos**. Depois avaliar X/D e Y/I sem juntar todas as heurísticas na mesma alteração.
- Registrar diagnóstico objetivo e testes para **ambas as mãos e sinais concorrentes**, incluindo A verdadeiro, V verdadeiro, K verdadeiro, D verdadeiro, I verdadeiro e J verdadeiro. Sem assumir que as condições simuladas são webcams reais.
- Criar ou ampliar coleta escalar rotulada das regras relevantes se o JSON não trouxer informação suficiente para calibrar. Desligado por padrão, sem envio automático.
- Em uma fase separada, priorizar recuperação E/M/N/S/T e alinhamento da dica de R a fonte pedagógica validada.
- Evitar commit automático, operações destrutivas no Git ou modificação do worktree exclusivo de CodeRabbit.
