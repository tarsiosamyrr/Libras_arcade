---
id: CHG-20261020-performance
status: implemented
date: 2026-10-20
affected_capabilities: core
---

# Instrumentação e redução de trabalho redundante — FASE 01

## Problema e contexto

FPS contava um histórico de até 20 entradas, independentemente do tempo. Canvas era limpo sem desenho e redefinido em cada resize. Faltava baseline executada; a tarefa atual autoriza otimizar `vision.js`/`app.js` sem alterar reconhecimento.

## Resultado esperado

Métricas com unidades e janelas explícitas, remoção de operações redundantes e comparação reproduzível, conservando os três jogos e a cadência de amostragem.

## Escopo

Loop, telemetria limitada, Canvas, testes focados, experimento rVFC/Worker e documentação. Trabalho local na branch `teste-ariel-versao-python`, autorizado pelo pedido explícito da FASE 01.

## Não escopo

Ciclo completo de câmera/modelo, tratamento de erros, timers dos jogos, regras/dados pedagógicos, coleta de imagens, migração, publicação ou FASE 02. Não há commit autorizado.

## Alternativas e decisão

Preservar rAF com deduplicação e 50 ms. Troca direta por rVFC reduz a frequência quando vídeo chega a 30 Hz. Worker requer validação da versão fixa, transferência, timestamps e descarte. Experimentos e decisão estão no [relatório](../../docs/performance/FASE01.md); nenhuma das alternativas foi adotada no runtime.

## Solução e fluxo

Medir `detectForVideo()` e callback com relógio monotônico; manter quatro buffers circulares de 120 posições e gerar estatísticas somente na consulta. Início invalida a cadeia anterior, zera métricas e mantém os critérios anteriores de elegibilidade. Parada não reagenda; reinício no consumidor não contamina a nova sessão. Canvas só limpa quando há mão ou desenho anterior e só redefine dimensões se necessário.

## Interfaces e dados afetados

`onResults(results, fps)` preservado; `fps` agora é contagem em `(agora−1000 ms, agora]`. Novo `getPerformanceMetrics()` devolve snapshot local de contadores e durações em ms, sem imagens/landmarks ou persistência. Modelo, resolução, thresholds e eventos existentes preservados.

## Falhas, segurança e compatibilidade

Detector/consumidor continuam síncronos e sem recuperação de exceção. Snapshot durante o consumidor ainda não contém sua duração final; HUD só atualiza ao receber resultado. Recursos completos são assunto da FASE 02. Testado em um Edge/Windows, sem afirmar compatibilidade geral. A entrada do benchmark é gerada e não usa webcam.

## Estratégia de testes

`node --experimental-vm-modules --test tests/performance.test.cjs` compara comportamento com o commit-base. Relógio controlado testa invariantes; Edge/MediaPipe real testa execução e métricas com entrada controlada. Conferir sintaxe, diff e hashes dos arquivos fora do escopo funcional.

## Critérios de aceite

Métricas comparáveis e justificativas registradas; regressões automáticas verificadas; ausência de mudança em configuração/classificador/jogos; limites de webcam e ruído do ambiente explícitos. Não equiparar fixtures sintéticas a precisão linguística.

## Consolidação na memória viva

[Capacidade](../capabilities/core.md), [sistema](../system.md), [testes](../testing.md), [README](../../README.md), [AGENTS](../../AGENTS.md), [roadmap](../../docs/ROADMAP.md) e [estado](../../docs/state.md). A capacidade permanece parcial até homologação mais ampla.
