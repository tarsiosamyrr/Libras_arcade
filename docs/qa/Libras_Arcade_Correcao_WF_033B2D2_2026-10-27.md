# FASE 03.3B-2D.2 — falso W/F após a revisão de B

**Estado:** regras W/F revistas localmente e verificadas por replay escalar e testes sintéticos. **W, F e B ainda exigem nova homologação independente com webcam.** Worktree `fase-03-cooldown-recuperado`, branch `recovery/fase-033b13-6170a2d`, HEAD inicial `82ae0bc`; alterações anteriores preservadas. Este relatório descreve a análise anterior ao checkpoint local solicitado depois.

## Evidência real e causa

O [relatório de QA recebido](Libras_Arcade_QA_BW_033B2D1_2026-10-27.md) foi incorporado ao projeto com apenas as quebras de linha Markdown normalizadas para o gate do diff. O JSON `qa-b-fase-033b2d1-webcam.json` foi analisado em Downloads e não incorporado ao projeto. Há quatro tentativas, uma por condição, com eventos escalares e sem landmarks completos. Três anéis chegaram a 120 eventos, logo seus inícios podem ter sido sobrescritos. As contagens abaixo cobrem só frames `recognition` com mão antes da **primeira confirmação preservada**; não são tentativas independentes nem medem precisão.

| Pose e mão física | Frames visíveis até a primeira confirmação | Primeira confirmação | Evidência decisiva |
| --- | ---: | --- | --- |
| B unido, direita | 33 | B, aceita | B liderou 24 frames; antes disso F liderou 9 |
| B unido, esquerda | 13 | F, rejeitada; B posterior, aceito | `thumbIndexPinch` 1,090–1,173 e F=0,75 no trecho da falha; B=0 nesse trecho |
| Quatro separados, direita | 38 | W, rejeitada | W liderou 22 frames; F liderou 16; mínimo estendido |
| Quatro separados, esquerda | 13 | W, rejeitada | W liderou 13 frames; mínimo estendido |

`RULES.W` fazia média de três dedos estendidos, mínimo recolhido e abertura M–R. Mesmo com `extPinky` entre 0,664 e 0,752 nos controles separados, o termo de fechamento era zero e os demais produziam W até 0,80. `curlPinky` perto de zero corrobora o mínimo reto detectado. `RULES.F` também fazia média: médio, anelar e mínimo estendidos mantinham F=0,75 com o termo da pinça zerado por `thumbIndexPinch≈1,05–1,07`. O primeiro F do B esquerdo tem o mesmo defeito geométrico; luz de fundo intensa foi relatada, mas o efeito óptico não pode ser provado pelos escalares. O hold confirmou candidatas persistentes conforme sua configuração, sem evidência de falha temporal ou de interface.

## Correção localizada e replay

W conserva sua média de forma, limitada por `Math.min` ao fator já existente de mínimo recolhido: `fuzzyOff(extPinky, 0,38, 0,50)`. F conserva sua média de forma, limitada ao fator já existente de pinça: `fuzzyOff(thumbIndexPinch, 0,42, 0,67)`. Os fatores obrigatórios são contínuos nas faixas anteriores; **não foram criados novos thresholds**, nem mudou B, R/U, V, U, escolha pela letra alvo, limiar global ou tempo de hold. Pontuações continuam heurísticas, não probabilidades.

O replay aplica `min(scoreF registrado, fator de pinça)` a cada frame e `min(scoreW anterior, fator de mínimo)` nos frames W líderes, usando os escalares reais. Como `extPinky>0,50` em todos os intervalos analisados, W projetado vale zero neles. O escore B continua exatamente como registrado. Os escores antigos foram lidos do JSON; o replay **não** reexecuta MediaPipe, landmarks completos, todos os concorrentes ou a máquina temporal.

| Pose/mão | B mediano, antes→depois | F mediano, antes→depois | W quando liderava, mediana antes→depois | F/W novos elegíveis entre frames visíveis |
| --- | ---: | ---: | ---: | ---: |
| B unido, direita | 1,000→1,000 | 0,750→0 | sem W líder; W projetado 0 | 0/33 |
| B unido, esquerda, trecho F | 0→0 | 0,750→0 | sem W líder; W projetado 0 | 0/13 |
| Quatro separados, direita | 0,079→0,079 | 0,750→0 | 0,760→0 em 22 frames | 0/38 |
| Quatro separados, esquerda | 0→0 | 0,750→0 | 0,800→0 em 13 frames | 0/13 |

Um frame B direito teve `thumbIndexPinch≈0,538`: F projetado atingiu no máximo **0,526**, ainda abaixo de 0,55. Nos outros três intervalos F projetado foi zero. A etapa intermediária W isolada **não resolve** o controle: no teste de motor com quatro dedos separados, a candidata mudou de W para F e sustentaria o hold. Nos frames reais em que W liderava, F constava como segunda colocada com 0,75. Após os dois gates, os controles sintéticos mantiveram V como candidata e chegaram a confirmar V; no JSON real `scoreV` mediano é 0,667 nos dois controles e elegível em 38/38 e 13/13 frames. Isso não autoriza alterar V nesta fase e impede chamar o controle de “sem falsos positivos” em geral. No B esquerdo durante a primeira fase F, U era segunda colocada em 13/13 frames, com 0,689–0,692; após retirar F, U pode assumir a liderança. O B verdadeiro apareceu depois, em 13 frames líderes antes de sua confirmação. A nova primeira confirmação dessa tentativa **não pode ser inferida** apenas do replay.

## Testes e custo

Dois novos testes de motor falharam antes da alteração: quatro dedos separados sustentavam W, inclusive após pausa/retomada. Com apenas o gate W, continuaram falhando por F; com ambos passaram. Verificam candidatas e ausência de `signconfirmed(B/W/F)` em projeções espelhadas, oscilação, profundidade e perspectiva moderadas. Um terceiro teste falhou pela ausência de `spreadMR`/`scoreW` na captura voluntária e passou após adicioná-los. Os positivos sintéticos de W com mínimo recolhido e F com pinça confirmam nas duas projeções; B unido e entrega ao Treino/Soletrar, R/U, A/O e demais regressões permanecem na suíte. Essas fixtures foram construídas para exercitar o motor e **não validam a anatomia nem a tolerância de F/W na webcam**.

`npm.cmd test`: **201/201**; `npm.cmd run test:camera`: **188/188**; `npm.cmd run test:performance`: **13/13**. `node --check` de `js/*.js` e do teste alterado, validador de specs, `git diff --check` e `git diff --cached --check` passaram. A execução normal já calcula `extPinky`, `thumbIndexPinch` e os dois fatores fuzzy; cada regra acrescenta só um `Math.min`, sem nova geometria, busca, buffer ou alocação por inferência. Somente a calibração voluntária passa a copiar `spreadMR` e `scoreW` como números, sem imagens, vídeos ou landmarks. Custo de FPS/CPU/RAM na webcam **não foi medido**.

## Limites, CodeRabbit e próxima webcam

O risco principal é falso negativo de F real se o MediaPipe reportar distância de pinça acima de 0,5325 por oclusão, perspectiva ou luz, pois nesse ponto o fator fica abaixo do limiar global. W real com `extPinky` próximo de 0,45 também pode perder elegibilidade. Não há controle real positivo F/W nesta rodada para estimar esses riscos; manter os gates como correção **provisória**. V sobre o controle de quatro dedos separados e U sobre o início instável do B esquerdo são riscos sucessores explícitos, sem mudança de regra nesta fase.

Coletar **novas tentativas independentes**, em ambas as mãos físicas, com espelho informado: W verdadeiro com mínimo recolhido; F verdadeiro com pinça verificada pelo overlay; B unido sob luz frontal controlada; `four_spread` com mínimo claramente estendido e polegar distante, usando `controlPose` sem informar a postura ao classificador. Fazer ao menos Treino e Soletrar para B/F/W e um controle curto R/U. Encerrar cada tentativa na primeira confirmação ou janela fixa curta, retirar a mão e aguardar rearmamento entre elas, mantendo o anel abaixo de 120 eventos. Em cada JSON comparar `extPinky`, `curlPinky`, `thumbIndexPinch`, `spreadMR`, `scoreB/F/W/V/U`, primeira e segunda candidatas, duração do hold, resets, `signconfirmed`, `ui_received` e `game_decision`. Registrar também qualquer V/U confirmado no controle, sem confundir rejeição do jogo com ausência de falso reconhecimento.

**CodeRabbit:** revisar se os fatores obrigatórios de F/W devem mesmo usar as faixas existentes para mãos reais, sobretudo pinça F sob oclusão; checar que `Math.min` não altera B/R/U nem a temporização; verificar a migração W→F→V e F→U nos registros; confirmar que `scoreW`/`spreadMR` só entram na captura voluntária e que o relatório não presume históricos completos dos anéis saturados. W/F e B só poderão ser homologados após essa nova webcam.
