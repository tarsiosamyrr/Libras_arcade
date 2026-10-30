# Candidato de demonstração — Libras Arcade

**Data:** 29/10/2026. **Origem:** `lab-competicao-gestos-v2`.

## Evidência automatizada disponível

Os testes existentes cobrem início dos três modos, seleção e navegação do Treino, encaminhamento de `signconfirmed`, pontuação, progresso do Soletrar, palpites e encerramento da Forca, cooldown, pausa e retorno ao menu. Os testes de câmera simulam inicialização, liberação de trilhas/modelo, falhas de permissão e inferência, retry e suspensão. As regressões de reconhecimento incluem S/T e os grupos B/W/F/V/K/U/R/A/O. Os comandos e totais executados estão em [testing.md](../../specs/testing.md). Essas simulações não verificam webcam, GPU/WASM, qualidade física dos sinais ou desempenho no equipamento da apresentação.

Após a integração local, o avaliador informou **9/9 cenários físicos aprovados**: S direita/esquerda, T direita/esquerda, C lateral direita/esquerda, O lateral direita/esquerda e A direita. Também informou aprovação manual de Treino, Soletrar, Forca, saída e reinicialização da câmera. Houve um pequeno travamento de interface. Não foram fornecidos instantes, métricas, ambiente ou orientações para S/T/A; estes resultados não se estendem a outras condições. C frontal continua instável e H/X continuam pendentes.

## Checklist manual para a demonstração

Os itens detalhados abaixo permanecem desmarcados quando o relato global não especificou todos os passos.

- [ ] Servir a raiz por `localhost` ou HTTPS; abrir a página no navegador e confirmar carregamento do modelo/WASM e vídeo com permissão de câmera.
- [ ] Conferir o esqueleto sobre a mão, enquadramento, espelhamento e iluminação no dispositivo da apresentação.
- [ ] Treino: iniciar por nível e por A–Z; usar Anterior, Próxima e Escolher letra; observar alvo, confirmação, pontuação e cooldown; pausar/retomar e voltar ao menu.
- [ ] Soletrar: iniciar, observar erro e acerto, progresso da palavra, transição e tela de resultado.
- [ ] Forca: iniciar, confirmar um palpite, observar letras reveladas e erros, encerrar a rodada e voltar ao menu.
- [ ] Negar a câmera uma vez e testar **TENTAR NOVAMENTE** após restaurar a permissão; ocultar/retomar a aba e confirmar que só uma sessão de câmera permanece ativa.
- [ ] Registrar separadamente qualquer tentativa física de S/T, C/O e controles H/X; não apresentar o alfabeto nominal como reconhecimento homologado.

## Pendências para decisão de apresentação

| Prioridade | Pendência | Critério prático |
| --- | --- | --- |
| Importante | Um pequeno travamento de interface foi observado, sem localização temporal ou métricas para determinar a causa. | Executar a medição curta abaixo no mesmo dispositivo e anotar modo, instante e duração percebida. |
| Importante | C frontal falhou ou oscilou nos relatos, e H/X têm apenas diagnóstico; S/T foram aprovados por mão, sem matriz de orientações ou condições. | Coletar tentativas curtas independentes com `scoreC/H/X` quando pertinente; ampliar S/T por modo e condição. |
| Importante | Os três modos, saída e reinicialização foram aprovados manualmente, mas os passos granulares de permissão negada, pausa e retomada não foram detalhados. | Percorrer os itens ainda desmarcados e registrar ambiente e primeiro bloqueio reproduzível. |
| Posterior | Y/E da implementação de referência, alfabeto inteiro, acessibilidade completa e compatibilidade entre navegadores. | Tratar em integração e QA próprios, sem ampliar o escopo do candidato. |
| Posterior | FPS, CPU e memória com mãos reais nesta versão. | Medir em protocolo separado; a suíte de performance atual verifica contratos lógicos. |

O processamento da câmera permanece local no navegador. Não há coleta automática de imagens ou landmarks. As tentativas voluntárias de calibração guardam apenas escalares em memória e têm buffer limitado.

## Medição curta do microtravamento

A inspeção estática encontrou um único agendador `requestAnimationFrame` com intervalo nominal de 50 ms, geração que invalida callbacks antigos e buffers de métricas limitados a 120 inferências. Trocar de modo não reinicia a câmera; ocultar a aba ou reiniciá-la passa por suspensão e novo boot. O diagnóstico desligado evita a captura por frame e a serialização do painel. A inferência `detectForVideo()` é síncrona na thread principal; o Canvas, o classificador e o cursor/DOM também executam no callback consumidor. Sem um instante reproduzível e tempos da webcam, nenhum desses pontos identifica a causa do travamento. O benchmark histórico usa vídeo gerado sem mãos; nesta worktree, `require.resolve('playwright')` falhou, então não houve novo benchmark de navegador.

No navegador e dispositivo da apresentação, com diagnóstico desligado, repetir separadamente 30 s de mão sinalizando em Treino, transição de modo e reinicialização da câmera. Anotar o segundo e a ação quando a pausa aparecer. No console da página, executar uma vez por trecho:

```js
void (async () => {
  const { getPerformanceMetrics } = await import('./js/vision.js');
  const rows = [];
  let previous = getPerformanceMetrics();
  const timer = setInterval(() => {
    const m = getPerformanceMetrics();
    const restarted = m.processedFrames < previous.processedFrames;
    rows.push({
      second: rows.length + 1, fps: m.fps,
      processedInSecond: restarted ? m.processedFrames : m.processedFrames - previous.processedFrames,
      restarted, callbacks: m.callbacks,
      skippedUnchanged: m.skippedUnchanged, skippedInterval: m.skippedInterval,
      inferenceMeanMs: m.inferenceMs.mean, inferenceP95Ms: m.inferenceMs.p95,
      inferenceMaxMs: m.inferenceMs.max, consumerMeanMs: m.consumerMs.mean,
      consumerP95Ms: m.consumerMs.p95, consumerMaxMs: m.consumerMs.max,
      cycleMeanMs: m.cycleMs.mean, cycleP95Ms: m.cycleMs.p95
    });
    previous = m;
    if (rows.length === 30) { clearInterval(timer); console.table(rows); }
  }, 1000);
})();
```

Os tempos são das últimas 120 inferências; FPS usa a última janela de 1 s. `skippedUnchanged` e `skippedInterval` contam callbacks ignorados, **não** frames perdidos da câmera. Para ver intervalos exatos entre frames renderizados e tarefas longas, gravar um trecho curto na ferramenta de performance do navegador, sem capturas de tela, e correlacionar com o segundo anotado. A coleta acima guarda somente 30 linhas de escalares na memória do console e não registra imagens ou landmarks. Comparar trechos do mesmo dispositivo e iluminação antes de atribuir a pausa a inferência, consumidor, renderização, transição ou reinício.

## Histórico da integração local

`feat/fase-03-cooldown` é ancestral de `lab-competicao-gestos-v2`: continha oito commits após a antiga ponta de `teste-ariel-versao-python`, seguidos por mais dez commits na branch de laboratório e pelos dois commits deste candidato. A integração anterior foi fast-forward de `1c09dd4` para `6683b1a`, preservando a FASE 03; a referência `backup/pre-merge-teste-ariel-20261029-1c09dd4` guarda a ponta anterior. Nenhum push foi feito naquela etapa. Na preparação, a branch local de destino estava quatro commits à frente do ref remoto; após aquela integração, ficou 24 commits à frente. A divergência atual exige novo `fetch` antes de publicar.

Os patches de C/O e sua fixture, o gate S/T com diagnóstico H/X e regressões pertencem ao grupo de implementação/testes; a documentação compõe outro grupo. `specs/changes/2026-10-29-lab-st-c-frontal.md` pertence à documentação aprovada porque registra o limite de C frontal e é referenciado pelas specs. `package-lock.json` e `libras-arcade-handoff-sotcx-e-y.md` permanecem fora dos commits.

Arquivos aprovados para os dois commits: `js/libras.js`, `js/diagnostics.js`, `tests/app-ui.integration.test.cjs`, `README.md`, `docs/ROADMAP.md`, `docs/state.md`, este checklist, `specs/capabilities/core.md`, `specs/system.md`, `specs/testing.md` e `specs/changes/2026-10-29-lab-st-c-frontal.md`. O gate U já está no HEAD da branch de laboratório; não há hunk U pendente de inclusão.
