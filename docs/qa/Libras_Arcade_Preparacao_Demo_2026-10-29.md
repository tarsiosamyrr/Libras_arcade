# Candidato de demonstração — Libras Arcade

**Data:** 29/10/2026. **Origem:** `lab-competicao-gestos-v2`.

## Evidência automatizada disponível

Os testes existentes cobrem início dos três modos, seleção e navegação do Treino, encaminhamento de `signconfirmed`, pontuação, progresso do Soletrar, palpites e encerramento da Forca, cooldown, pausa e retorno ao menu. Os testes de câmera simulam inicialização, liberação de trilhas/modelo, falhas de permissão e inferência, retry e suspensão. As regressões de reconhecimento incluem S/T e os grupos B/W/F/V/K/U/R/A/O. Os comandos e totais executados estão em [testing.md](../../specs/testing.md). Essas simulações não verificam webcam, GPU/WASM, qualidade física dos sinais ou desempenho no equipamento da apresentação.

Na preparação da integração, foi relatado smoke test físico com **9/9 cenários aprovados**. A relação dos cenários, o equipamento e os registros não foram anexados a este repositório; por isso, a contagem não comprova cada item do roteiro abaixo nem homologa letras isoladas.

## Checklist manual para a demonstração

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
| Crítica | Há relato de smoke físico 9/9, mas faltam matriz de cenários, ambiente e evidência da recuperação de câmera no dispositivo da apresentação. | Conferir os dois primeiros itens do checklist e verificar retry antes da demonstração ao vivo. |
| Importante | S/T ainda não têm validação física após o gate; C frontal falhou ou oscilou nos relatos, e H/X têm apenas diagnóstico. | Coletar tentativas curtas independentes nas duas mãos, com `scoreC/H/X` quando pertinente; não prometer essas letras na demonstração. |
| Importante | Os três modos e a pausa foram verificados por simulação, sem uma passagem manual completa nesta versão. | Percorrer o roteiro acima com webcam e anotar o primeiro bloqueio reproduzível. |
| Posterior | Y/E da implementação de referência, alfabeto inteiro, acessibilidade completa e compatibilidade entre navegadores. | Tratar em integração e QA próprios, sem ampliar o escopo do candidato. |
| Posterior | FPS, CPU e memória com mãos reais nesta versão. | Medir em protocolo separado; a suíte de performance atual verifica contratos lógicos. |

O processamento da câmera permanece local no navegador. Não há coleta automática de imagens ou landmarks. As tentativas voluntárias de calibração guardam apenas escalares em memória e têm buffer limitado.

## Preparação de integração

`feat/fase-03-cooldown` é ancestral de `lab-competicao-gestos-v2`: contém oito commits após `teste-ariel-versao-python`, seguidos por mais dez commits na branch de laboratório. Portanto, integrar a branch de laboratório inclui a FASE 03 e seus commits; integrar `feat/fase-03-cooldown` separadamente não é necessário para preservá-los. O destino autorizado para integração local é `teste-ariel-versao-python`, conforme o contrato do projeto. Os refs remotos consultados em 29/10/2026 tinham apenas `main` e `teste-ariel-versao-python`, ambos no commit inicial; a branch local de destino já está quatro commits à frente desse ref remoto.

Os patches de C/O e sua fixture, o gate S/T com diagnóstico H/X e regressões pertencem ao grupo de implementação/testes; a documentação compõe outro grupo. `specs/changes/2026-10-29-lab-st-c-frontal.md` pertence à documentação aprovada porque registra o limite de C frontal e é referenciado pelas specs. `package-lock.json` e `libras-arcade-handoff-sotcx-e-y.md` permanecem fora dos commits.

Arquivos aprovados para os dois commits: `js/libras.js`, `js/diagnostics.js`, `tests/app-ui.integration.test.cjs`, `README.md`, `docs/ROADMAP.md`, `docs/state.md`, este checklist, `specs/capabilities/core.md`, `specs/system.md`, `specs/testing.md` e `specs/changes/2026-10-29-lab-st-c-frontal.md`. O gate U já está no HEAD da branch de laboratório; não há hunk U pendente de inclusão.
