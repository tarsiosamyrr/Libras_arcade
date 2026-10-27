# Libras Arcade | Diagnóstico contrastivo V/K, Fase 03.3B-2D.3

**Data:** 27/10/2026. **Base Git:** `a801633`, branch `recovery/fase-033b13-6170a2d`.

## Fonte e limite da evidência

O relatório externo `Libras_Arcade_Diagnostico_VK_033B2D2_2026-10-27.md` e o JSON `qa-four-spread-versao-2d2-confirmada.json` foram lidos em Downloads. SHA-256 do JSON: `767C3C483F6D0CA8FDD48B57863389282DE026014F0E41737EB5DDB15592F49F`. Trata-se de **uma** captura voluntária longa de `four_spread`, mão física direita, frontal, espelhada. O buffer circular ficou cheio (120 eventos); 50 frames com mão e uma confirmação V são visíveis. O resumo contabiliza três confirmações, mas as outras duas não podem ser identificadas a partir do buffer. Não há landmarks completos, vídeo ou controles físicos V/K neste conjunto.

## Causa demonstrada no classificador

Em `RULES.V`, quatro termos positivos (indicador e médio estendidos, afastamento entre eles e polegar longe do intervalo entre as pontas) compensam dois termos nulos (anelar e mínimo abertos). A média é `4/6 = 0,6667`, acima do corte global `0,55`. O fator de orientação/polegar não desconta essa pose. Os escalares reais mostram mediana de extensão de anelar `0,946`, de mínimo `0,710` e curvaturas próximas de zero. No trecho retido V lidera 49/50 frames e a primeira confirmação V visível ocorreu em `t=58295,8 ms`. A UI recebeu V e o Treino a rejeitou corretamente ao esperar B.

Em `RULES.K`, indicador e médio estendidos, sua abertura e a direção ascendente somam quatro dos sete componentes. Anelar fechado, mínimo fechado e polegar perto do intervalo entre os dedos dão zero. O resultado `4/7 = 0,5714` ainda é elegível. A mediana real de `thumbBetweenIM` é `0,832`, longe da faixa próxima `0,28–0,50`; logo, o próprio controle não contém a evidência de polegar exigida pela descrição pedagógica de K.

## Replay escalar e temporal

As 50 linhas com mão foram passadas à função `classify()` do código real, com os escalares da captura. Candidata principal, segunda colocada e os dois escores tiveram **zero divergências** em relação ao JSON. Foi usado um patch **somente em memória** para comparar cenários: os gates tornam obrigatório `fuzzyOff(extRing)` e `fuzzyOff(extPinky)` com as transições locais já existentes (`0,38–0,50`). O replay temporal chama `_advanceConfirmation()` com os timestamps preservados e reinicia no `tracking_reset`; ele não recompõe landmarks, movimento, histórico anterior ao anel nem decisões do jogo.

| Cenário no replay | Candidata dos 50 frames com mão | Primeira confirmação reconstruída |
| --- | --- | --- |
| Regras do checkpoint | V em 49; W em 1 | V em `58295,8 ms`, igual ao primeiro evento V preservado |
| Gate de fechamento só em V | K em 49; W em 1 | **K em `58295,8 ms`** |
| Gates de fechamento em V e K | U em 49; W em 1 | Nenhuma confirmação no trecho retido |

No terceiro cenário a candidata principal é elegível em quatro frames ao todo, incluindo o W transitório; U não sustenta o hold no replay. A reconstrução de quaisquer eventos adicionais não prova a identidade das duas confirmações perdidas no buffer. Uma captura física nova é necessária.

**Decisão de segurança:** o gate exclusivo de V corrige seu escore no controle, mas transfere o falso positivo para K no mesmo instante observado. Portanto, publicar apenas o gate V não satisfaz o controle negativo. K também precisa de um discriminante obrigatório, testado com K legítimo; fechamento de anelar/mínimo e posição do polegar são candidatos geométricos, sem necessidade de alterar o corte global ou o hold. Uma mudança em K é independente e requer proteção por controles positivos; o replay não substitui essa evidência física.

Uma regressão temporária no harness com `fourFingerPose` espelhada falhou primeiro por V e, após aplicar apenas o gate V, falhou por K no primeiro frame. Os controles sintéticos V, K e P já presentes passaram com o gate V. Esse teste vermelho e o patch V isolado foram retirados do worktree por não constituírem uma correção segura. **As regras funcionais V/K e o conjunto de testes versionados permanecem iguais ao checkpoint.** O custo por inferência também permanece igual; não houve medição física de CPU, memória ou FPS.

Verificação do checkpoint sem alteração funcional: `npm.cmd test` **201/201**, `npm.cmd run test:camera` **188/188**, `npm.cmd run test:performance` **13/13**. `node --check` em `js/*.js` e no teste de integração passou. O validador `validate_specs.py` passou com o Python do runtime local; o launcher `py` do WindowsApps não conseguiu abrir seu executável. A suíte de performance verifica contratos lógicos e não mede custo físico desta investigação.

Na revisão CodeRabbit de uma futura correção, conferir que V e K realmente exigem os dedos recolhidos sem perder variação natural, que o polegar diferencia K de V conforme a configuração pedagógica e que U ou outra regra não assume um hold falso após os gates. Revisar decisões por frame e `signconfirmed`, não apenas escore isolado. Este diagnóstico não contém patch funcional para revisão.

## Homologação independente necessária

Realizar tentativas **separadas e curtas**, encerradas na primeira confirmação ou após janela fixa de cerca de um segundo sem confirmação, para não sobrescrever 120 eventos. Coletar V e K legítimos nas mãos físicas direita e esquerda; repetir `four_spread` nas duas mãos; incluir U, R, B, W e F como controles de regressão. Em cada tentativa registrar orientação frontal/oblíqua, distância, espelhamento real e iluminação. Conferir por frame `ext*`, `curl*`, `spreadIM`, `thumbBetweenIM`, `scoreV/K/U` e as duas candidatas; acompanhar `hold_reset`, `signconfirmed`, `ui_received` e `game_decision`. O sinal pretendido deve liderar continuamente até a confirmação; `four_spread` não deve confirmar V, K nem outra letra indevida. Testes de landmarks construídos e este replay não homologam desempenho de webcam.
