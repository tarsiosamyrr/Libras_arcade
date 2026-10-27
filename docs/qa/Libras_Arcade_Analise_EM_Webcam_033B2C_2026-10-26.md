# Libras Arcade | Diagnóstico webcam E/M (03.3B-2C)

Data: 26/10/2026. Fonte exclusiva: `qa-em-fase-033b2c-webcam.json` (4 capturas).

## Resumo

- O arquivo contém **4, não 12**, capturas: E direita/esquerda e M direita/esquerda. Não contém S, A, O, N nem B como controles independentes.
- **0 de 4 primeiras confirmações corretas**: E direita→O, E esquerda→A, M direita→B, M esquerda→B.
- `signconfirmed`, `ui_received` e `game_decision` mostram rejeição coerente da letra errada; o problema antecede a UI.
- **3 capturas chegaram ao anel de 120 eventos** (E direita, E esquerda, M esquerda), perdendo o `calibration_start` e potencialmente outros eventos iniciais. E direita teve 2 confirmações.
- O rótulo `intendedLetter` indica intenção do teste, mas não comprova qual postura física foi detectada pelo MediaPipe. A captura M registrou perfil fortemente compatível com mão aberta/B.

## Tabela até a primeira confirmação

| Nº | Intenção | Mão | Emissão | Frames com mão | Principais candidatas | Mediana letra-alvo | Mediana vencedora | Resets total | Eventos |
|---|---|---|---|---:|---|---:|---:|---:|---:|
| 1 | E | right | O | 11 | O:10, S:1 | 0.558 | 0.999 | 3 | 120 |
| 2 | E | left | A | 47 | A:34, X:12, O:1 | 0.686 | 1.000 | 15 | 120 |
| 3 | M | right | B | 21 | B:19, P:2 | 0.000 | 0.800 | 4 | 117 |
| 4 | M | left | B | 12 | B:12 | 0.000 | 0.800 | 0 | 120 |

## Diagnóstico E

- **E direita:** primeira confirmação O, rejeitada pelo Treino (esperava E). Entre 11 frames com mão até a primeira confirmação: O liderou 10, S liderou 1. Medianas: `scoreO≈0.999`, `scoreS≈0.758`, `scoreE≈0.558`; `thumbMiddlePinch≈0.421`, `thumbOut≈0.256`.
- **E esquerda:** primeira confirmação A, rejeitada pelo Treino (esperava E). Entre 47 frames: A liderou 34, X liderou 12, O liderou 1. Medianas: `scoreA≈1.000`, `scoreE≈0.686`, `scoreO≈0.750`; `thumbMiddlePinch≈0.681`, `thumbOut≈0.484`. A/X alternaram e houve 15 `hold_reset` no registro completo.
- As duas capturas E apresentam perfis distintos de polegar e curvatura; não é possível transformar essas medidas em regras exclusivas sem controles reais de A, O e S. A letra X também precisa ser considerada como concorrente na captura esquerda.

## Diagnóstico M

- **M direita:** primeira confirmação B, rejeitada pelo Treino (esperava M). Entre 21 frames: B liderou 19, P liderou 2. Medianas `scoreB≈0.800`, `scoreM≈0.000`; `extIndex≈1.177`, `extMiddle≈1.438`, `extRing≈1.383`; curvaturas dos três dedos ≈0.001.
- **M esquerda:** B liderou 12 de 12 frames até a confirmação, com `scoreB≈0.800` e `scoreM≈0.000`. Medianas `extIndex≈1.384`, `extMiddle≈1.703`, `extRing≈1.748`, `extPinky≈1.440`; curvaturas praticamente nulas.
- Nos frames posteriores até o fim da mão detectada, o padrão B e `scoreM≈0` persistiram. Isso sugere que o modelo recebeu landmarks de dedos estendidos, não a configuração geométrica de M esperada pela regra. Não é possível determinar a causa apenas pelo JSON: pode ser postura apresentada, aquisição antes de formar o sinal, rastreamento/oclusão, espelhamento ou outro problema.
- **Não há justificativa técnica para favorecer M contra B nesses dados:** isso criaria um falso positivo em mãos abertas. Primeiro é necessário repetir M com a postura visualmente conferida e compará-la com B como controle.

## Integridade do protocolo

- Duração dos logs: aproximadamente 9.58 s (E direita), 6.16 s (E esquerda), 6.14 s (M direita), 6.43 s (M esquerda), maior que a janela curta planejada. Capturar desde pouco antes da entrada da mão e parar logo após a primeira confirmação ou após ~2 s sem confirmação.
- `calibration_start` está presente apenas na captura M direita; as demais completaram 120 eventos. As primeiras confirmações ainda constam dos eventos retidos; métricas de abertura de captura não podem ser reconstituídas nas capturas sobrescritas.
- Primeira confirmação incorreta em todas as capturas e entrega funcional à UI/jogo comprovada; sem evidência de falha de UI.

## Próxima ação recomendada

1. **Prioridade A:** repetir M direita/esquerda com a forma de M já montada fora do enquadramento, entrar e manter imóvel. Conferir visualmente a postura e, se disponível, o esqueleto/landmarks sobrepostos. Parar no primeiro reconhecimento ou após janela curta. Registrar se a mão realmente apareceu fechada no vídeo.
2. Capturar B direita/esquerda como controle negativo de M. Registrar o mesmo enquadramento, distância e espelhamento.
3. Completar controles E: S, A e O em ambas as mãos. Considerar X como concorrente da captura E esquerda. Capturar N para avaliar M/N sem editar a regra N.
4. Para as próximas capturas, separar tentativas e preservar eventos de início. Não somar os frames como se fossem tentativas independentes.
5. Só propor correções em `RULES.E`/`RULES.M` com comparações entre gestos reais, preservando S/N/A/O/B/R/U e hold/cooldown.

## Fronteiras de conclusão

- **Confirmado:** a falha observada é de classificação antes da interface, em quatro capturas, com os escores discriminados acima.
- **Não comprovado:** que a forma física de M foi adquirida corretamente; que N é o principal concorrente; que alterações de limiar recuperariam E/M; desempenho em outras orientações ou outras pessoas.
- **Não fazer:** commit funcional, alteração global de thresholds, edição de N/S ou tentativa de converter B em M por pontuação.
