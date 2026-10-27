# Libras Arcade | Auditoria da webcam 03.3B-2D.1: B e falso W

Data: 2026-10-27

Fonte: `qa-b-fase-033b2d1-webcam.json` (4 registros, 1 por condição).

Escopo: análise retrospectiva da calibração; **não** constitui medição do classificador após nova correção.

## Resumo

A correção de B resolveu o falso positivo específico nas duas capturas com quatro dedos separados: **nenhuma confirmou B**. Contudo, ambas confirmaram indevidamente **W**. O B com dedos juntos confirmou B à direita. À esquerda, primeiro confirmou **F** incorretamente e depois **B** corretamente. O operador relatou que o erro inicial ocorreu sob forte luz de fundo. A causa óptica é plausível, mas não demonstrável a partir dos escalares isoladamente.

| # | Postura | Mão física | Primeira confirmação | Confirmações subsequentes | UI/jogo |
|---|---|---|---|---|---|
| 1 | B unido | Direita | B | Nenhuma | B aceita |
| 2 | B unido | Esquerda | F | B | F rejeitada; B aceita |
| 3 | Quatro separados | Direita | W | Nenhuma | W rejeitada, B não emitido |
| 4 | Quatro separados | Esquerda | W | Nenhuma | W rejeitada, B não emitido |

As capturas 1, 2 e 3 chegaram à capacidade de 120 eventos, de modo que o início do registro foi sobrescrito; a captura 4 preservou 69 eventos e o evento de início. Resumos de calibração e confirmações ainda são legíveis. Não usar contagens de frames como amostras independentes.

## Métricas medianas até a primeira confirmação registrada

| Campo | B unido direita | B unido esquerda (fase F) | Quatro separados direita | Quatro separados esquerda |
|---|---:|---:|---:|---:|
| `lateralRatioIM` | 0,941 | 1,061 | 1,969 | 1,973 |
| `lateralRatioMR` | 0,883 | 0,809 | 1,682 | 1,869 |
| `lateralRatioRP` | 1,249 | 1,325 | 2,157 | 2,499 |
| `scoreB` | 1,000 | 0,000 | 0,079 | 0,000 |
| `scoreF` | 0,750 | 0,750 | 0,750 | 0,750 |
| `thumbIndexPinch` | 1,061 | 1,111 | 1,072 | 1,052 |
| `extPinky` | 0,650 | 0,651 | 0,707 | 0,698 |
| `curlPinky` | aprox. 0,001 | aprox. 0,000 | aprox. 0,000 | aprox. 0,001 |

As medianas são calculadas em frames com mão presente anteriores ou coincidentes com a primeira confirmação preservada. Na segunda captura, o trecho *anterior à primeira confirmação* é o falso F, não o B correto que ocorreu depois. Não comparar o `scoreB=0` dessa coluna com o trecho B posterior sem essa ressalva.

## Sequência temporal

- B unido, direita: registro conta uma confirmação B, aceita. Antes dela, as candidatas amostradas foram F em 9 frames e B em 24 frames. Houve 11 eventos de `hold_reset`, compatíveis com transições durante apresentação/iluminação.
- B unido, esquerda: 13 frames de F antes da primeira confirmação (F emitiu após aproximadamente 657 ms desde sua primeira candidatura). Em seguida B foi confirmado e aceito depois de uma sequência de 13 frames B, durante aproximadamente 650 ms.
- Quatro separados, direita: antes de W confirmado houve 16 frames com F candidata e 22 com W candidata; W alcançou escore 0,8, contra F 0,75. Nenhuma confirmação B.
- Quatro separados, esquerda: 13 frames consecutivos com W candidata antes da confirmação (aproximadamente 640 ms), também W 0,8 versus F 0,75; nenhuma confirmação B.

## Diagnóstico técnico

**B:** Os escalares confirmam boa separação entre B unido (razões tipicamente 0,8–1,3) e quatro separados (tipicamente 1,7–2,5). Sob o controle negativo B ficou abaixo de 0,55 e não foi emitido. Manter a regra 2D.1 neste momento. B unido à esquerda ainda precisa de uma captura limpa, com boa iluminação e primeira confirmação B, antes de homologação frontal formal para ambas as mãos.

**W:** Os quatro dedos do controle negativo estão estendidos, incluindo o mínimo (`extPinky≈0,7`; `curlPinky≈0`). Apesar disso W venceu e confirmou nas duas mãos, com escore 0,8. Inspecionar a composição de `RULES.W` e verificar se uma média permite satisfazer a classe mesmo quando o componente obrigatório de mínimo recolhido falha.

**F:** Em ambos os negativos, `scoreF=0,75` sustentado, mesmo com `thumbIndexPinch≈1,05–1,07` (sem proximidade efetiva nas medidas normalizadas). **Reduzir apenas W pode fazer F vencer**. Inspecionar se `RULES.F` exige realmente contato/pinça entre polegar e indicador em vez de apenas permitir uma média elevada de dedos estendidos. Não modificar F precipitadamente sem capturas/fixtures positivas genuínas de F.

## Próximo trabalho recomendado

1. Registrar esta rodada como: B nos controles negativos aprovado; B positivo direito aprovado; B positivo esquerdo com sucesso posterior, porém primeira confirmação errada F sob iluminação adversa; falso W bilateral reproduzido.
2. No Codex, auditar a regra W e a competição com F. Propor critérios obrigatórios localizados, não um bloqueio por letra esperada ou por rótulo de calibração.
3. Criar testes de quatro dedos separados sob ambas as mãos que exijam ausência de **W, F e B**, mais positivos W e F genuínos e B unido.
4. Não copiar regras inteiras dos colegas, não mexer em N/S/E/M/R/U nem limiar ou hold globais.
5. Validar W e F reais nas duas mãos antes de considerar a nova etapa homologada. Repetir B esquerdo sob luz controlada.
6. Registrar FPS/custo da inferência se forem acrescentadas novas features geométricas.

## Limitações

Quatro capturas de uma sessão não medem acurácia geral. A relação causal entre luz de fundo e o primeiro F da segunda captura não pode ser determinada somente por escores. Três capturas atingiram o limite do anel de eventos. O JSON registra escores principais e `scoreF`, mas não contém um campo escalar independente `scoreW` em cada frame; o valor de W é observável quando W é a candidata principal.
