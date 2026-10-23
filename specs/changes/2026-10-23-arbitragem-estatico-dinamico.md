---
id: CHG-20261023-arbitragem-estatico-dinamico
status: implemented
date: 2026-10-23
affected_capabilities: core
---

# FASE 03.1 — arbitragem estática/dinâmica e rearmamento

## Problema e contexto

No commit `4af4a98`, D e I eram também as poses-base de Z e J. O comprimento acumulado do trajeto suavizado, a partir de 0,13 da escala da mão, anulava o hold estático mesmo sob pequenas oscilações sem desenho válido. Durante `COOLDOWN` e `WAIT_RELEASE`, o motor deixava de acompanhar trajetórias; D→Z e I→J permaneciam bloqueados quando a candidata estática não mudava. Após confirmar J/Z, I/D residual era tratado como outra letra estável e podia confirmar sem nova ação. Testes do caminho completo de `LibrasEngine.update()` reproduziram os três caminhos; não medem a frequência em webcam real.

## Resultado esperado

Confirmar D/I estáticos apesar de pequenos ajustes, permitir D→Z e I→J por trajetória nova após o cooldown e impedir que I/D residuais de J/Z confirmem sem ação nova. Manter evento único e câmera responsiva.

## Escopo

Arbitragem da pose-base e trajetória, observação durante cooldown, rearmamento após J/Z, limpeza de buffer e regressões sintéticas nos três modos.

## Não escopo

Recalibração geométrica das demais letras, cronômetro do Soletrar, novas dependências, migração de linguagem ou alegação de precisão com webcam.

## Alternativas e decisão

- Aumentar hold ou cooldown manteria a ambiguidade da pose-base e atrasaria todas as letras. Não adotado.
- Aceitar qualquer movimento acumulado como intenção preservaria o bloqueio de D/I por tremor. Não adotado.
- Usar deslocamento líquido recente para arbitrar a preparação de J/Z, observar trajetórias durante a espera e distinguir pose residual de nova ação. Adotado com as regras abaixo.

## Solução e fluxo

As fases externas continuam `READY`, `STABILIZING`, `CONFIRMED`, `COOLDOWN` e `WAIT_RELEASE`. Hold estático de 600 ms, cooldown mínimo de 900 ms, liberação de 250 ms e mudança estática de 300 ms não foram aumentados. Os novos valores são hipóteses de engenharia, em milissegundos monotônicos e distâncias normalizadas pela escala da mão, não uma calibração de precisão:

| Configuração | Valor | Função |
| --- | ---: | --- |
| `MOTION_INTENT_WINDOW_MS` | 400 ms | Janela recente para medir deslocamento líquido, sem somar oscilações antigas. |
| `MOTION_INTENT_MIN_SPAN` | 0,06 | Deslocamento recente mínimo para suspender temporariamente o hold D/I. |
| `MOTION_INTENT_GRACE_MS` | 300 ms | Se o movimento deixa de progredir, descarta o trajeto incompleto e devolve D/I ao hold. |
| `MOTION_ANCHOR_STILL_SPAN` | 0,03 | Substitui amostras estacionárias anteriores ao início da trajetória. |
| `MOTION_REARM_STILL_MS` / `MOTION_REARM_STILL_SPAN` | 250 ms / 0,04 | Exige pausa observável da ponta após J/Z antes de seguir outro trajeto da mesma pose. |

Uma trajetória J/Z completa tem prioridade sobre a pose estática. Durante cooldown, o motor pode **observar** uma intenção dinâmica; uma trajetória completada antes de 900 ms é descartada sem evento. Uma trajetória nova que se completa depois do prazo rearma e confirma, mesmo que D/I continue como candidata estática. O buffer é zerado após confirmação, trajeto inválido que cessou, rearmamento, troca de sessão ou pausa. Falha de landmarks por até 300 ms preserva apenas o trajeto incompleto; falha mais longa o descarta.

Depois de J/Z, a pose-base I/D não satisfaz a regra de “outra letra”. Para obter I/D, o jogador precisa liberar a candidata por 250 ms ou apresentar outra pose estável. Para repetir J/Z, precisa haver pausa observável da ponta e uma trajetória nova. Uma troca estável para a outra pose-base também pode rearmar J↔Z. O anel não indica progresso confirmável durante cooldown. O evento `signconfirmed { letter }`, os jogos, o cronômetro, a câmera e o loop rAF permanecem com seus contratos existentes.

## Interfaces e dados afetados

`LibrasEngine.update()` recebe os mesmos resultados e timestamps e mantém `state.recognitionPhase` e `signconfirmed { letter }`. As configurações `MOTION_*` foram acrescentadas em `js/libras.js`. Nenhum dado de câmera é gravado ou transmitido. `resetTracking()` continua a limpar estado temporal e buffers na pausa e na troca de tela.

## Falhas, segurança e compatibilidade

Perda de landmarks superior a 300 ms, pausa e sessão nova descartam trajetórias incompletas. O reconhecimento permanece local. Não há novo timer, listener, dependência ou alteração do contrato dos três jogos. Observar J/Z durante cooldown acrescenta processamento quando a pose-base está presente; CPU/RAM comparáveis não foram medidos.

## Estratégia de testes

Os testes novos ampliam `tests/app-ui.integration.test.cjs` e usam o harness já existente com relógio e webcam simulados: D/I estáticos com oscilações, D→Z, I→J, residual Z→D/J→I com e sem nova intenção, J/Z lentos e rápidos, trajetórias incompletas, timestamps irregulares, perdas curtas e longas, cooldown, trajetórias consecutivas, troca de tela/sessão, pausa/retomada, evento único e letra estática não relacionada. A suíte anterior de 60 testes continua como regressão.

O limiar de intenção pode ainda favorecer ou prejudicar determinadas velocidades, distâncias e orientações reais. MediaPipe/GPU, CPU/RAM, precisão pedagógica e taxa de confirmação exigem webcam e protocolo com amostras consentidas. Nenhuma regra geométrica das outras letras ou cronômetro foi recalibrado nesta fase.

## Critérios de aceite

Na simulação, D/I estáticos com oscilação confirmam uma vez; trajetórias válidas J/Z rearmam depois de 900 ms; pose-base residual não confirma; trajetórias antigas não atravessam sessão, pausa nem perda longa de landmarks; as 60 regressões anteriores continuam passando. Webcam real permanece critério de homologação separado.

## Consolidação na memória viva

[Capacidade](../capabilities/core.md), [sistema](../system.md), [testes](../testing.md), [README](../../README.md), [roadmap](../../docs/ROADMAP.md) e [estado](../../docs/state.md).
