---
id: CHG-20261029-lab-st-c-frontal
status: implemented
date: 2026-10-29
affected_capabilities: core
---

# Laboratório S/T e diagnóstico de C frontal

## Problema e contexto

Nas capturas relatadas para esta entrega, S apresentou indicador recolhido e T, indicador estendido. A média anterior de `RULES.T` não consultava `extIndex`, permitindo T como candidata para S.

O relato de oito tentativas com webcam mostra C lateral reconhecido nas duas mãos e O frontal/lateral reconhecido nas duas mãos. C frontal direito confirmou H e depois X; C frontal esquerdo confirmou C primeiro, mas com instabilidade e confirmações adicionais. H favorece indicador e médio estendidos na direção lateral; X favorece indicador curvo e os demais dedos recolhidos. `classify()` escolhe o maior escore, sem margem; como C precede H e X na ordem das regras, H/X vencedores tiveram escore superior ao de C nos respectivos frames. Sem os escores e a geometria desses frames, não é possível atribuir a falha a um componente específico nem definir um limite seguro para C, H ou X.

## Resultado esperado

Evitar T quando o indicador está recolhido, preservar T com indicador estendido e permitir investigar C frontal por concorrente, sem alterar as regras C/H/X nesta etapa.

## Escopo

Gate geométrico local em `RULES.T`, duas regressões S/T pelo motor, exposição de `scoreH`/`scoreX` na calibração e registro dos limites da investigação de C.

## Não escopo

Recalibrar C, H, X, S, A ou Y; alterar ranking, letra alvo, jogos, máquina temporal ou captura de imagens e landmarks.

## Alternativas e decisão

Elevar S ou mudar a ordem global esconderia a concorrência e poderia afetar outras letras. O fator de extensão em T corresponde à separação observada entre S/T e reduz apenas T. Para C, faltam controles físicos H/X e escores pareados: a decisão é medir primeiro, mantendo o patch C preexistente.

## Solução e fluxo

Somente T passou a exigir `fuzzyOn(extIndex, FINGER_EXT_ON, FINGER_EXT_ON + 0.30)` como teto da média anterior. O limiar geral de elegibilidade continua 0,55 e o motor temporal recebe a candidata da mesma forma. Na calibração voluntária, `classify()` calcula os escores de H e X já executados normalmente e `_traceFrame()` os repassa ao diagnóstico.

## Interfaces e dados afetados

`signconfirmed`, `state.features`, eventos de jogo e armazenamento não mudaram. A leitura de calibração ganha `scoreH` e `scoreX` como números finitos quando há mão válida. X já estava no conjunto de regras de calibração, mas faltava na lista de campos permitidos; H faltava nos dois pontos.

## Falhas, segurança e compatibilidade

A classificação e o limite de 120 eventos em memória permanecem. Imagens, vídeo e landmarks não são registrados. O gate pode descartar T quando a webcam subestima a extensão do indicador; é necessária validação física em ambas as mãos antes de homologar.

## Estratégia de testes

As fixtures sintéticas S/T reproduziram T vencendo S antes do gate; depois, S e T foram confirmados nas respectivas geometrias. T manteve hold de 600 ms, cooldown, troca estável para S e confirmação única. A instrumentação foi verificada sem landmarks registrados. `npm.cmd test`, `npm.cmd run test:camera` e `npm.cmd run test:performance` passaram, sem medir custo de webcam.

## Critérios de aceite

Em código, S recolhido não confirma T; T estendido confirma uma vez após hold; a troca T→S respeita cooldown e novo hold; `scoreH` e `scoreX` aparecem apenas na captura voluntária sem alterar o buffer. A correção física de C permanece pendente.

## Consolidação na memória viva

O contrato parcial está em `specs/capabilities/core.md`, a regra e o fluxo em `specs/system.md`, os comandos e resultados em `specs/testing.md`, e a próxima coleta em `docs/ROADMAP.md` e `docs/state.md`.

## Próxima validação

Em tentativas independentes e curtas, coletar C, H e X verdadeiros nas duas mãos, frontal e lateral quando aplicável, com espelho e distância anotados. Encerrar cada captura após a primeira confirmação ou janela curta para conservar os frames iniciais no anel. Comparar por frame `scoreC`, `scoreH`, `scoreX`, `curlIndex/Middle/Ring/Pinky`, `extIndex/Middle/Ring/Pinky`, `thumbMiddlePinch`, `spreadIM`, `pointAngleIM`, candidata, segunda colocada e resets de hold. Confirmar visualmente pose e overlay. Repetir S e T verdadeiros nas duas mãos e nos três jogos antes de declarar estabilização física.
