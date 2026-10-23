# Estado da entrega

- FASE 00 concluída: arquitetura e diagnóstico documentados; equivalência estrutural, dados, sintaxe, HTTP local e documentação verificados. Sem alteração funcional.
- A pasta não rastreada `Libras_arcade/` é preexistente e foi preservada.
- FASE 01 implementada e verificada automaticamente: métricas reais de inferência/FPS, loop único, Canvas, 13 testes e integração de navegador. [Relatório, diff resumido e evidências](performance/FASE01.md).
- Orca indisponível; usado subagente nativo de revisão, sem edição concorrente. Achado sobre métrica ao parar o loop foi reproduzido e corrigido.
- MediaPipe real medido com vídeo controlado sem mãos. Precisão por webcam, CPU/RAM total e matriz de dispositivos permanecem sem homologação.
- FASE 02 consolidada no commit local `fb22e89`, na branch `integracao/fase-02-camera`. O worktree `review/integracao-02` permanece separado e não foi alterado nesta tarefa.
- FASE 02.1: correções A-1/M-1 implementadas na branch atual por autorização explícita do usuário; commit local autorizado após revisão. Sem merge, cherry-pick ou push nesta tarefa. A pasta não rastreada `Libras_arcade/` permanece preservada.
- Suíte completa: 34/34 testes com `npm.cmd test` (25 anteriores + 9 novos); `npm.cmd run test:camera`: 21/21; `npm.cmd run test:performance`: 13/13. Testes de falha de armazenamento e sequência foram executados antes da correção e 7 falharam. Sintaxe dos sete módulos, `git diff --check` e validação documental aprovados.
- Na FASE 02.1, webcam real, desempenho em hardware e mensagens da tela de erro da câmera não tinham sido validados; o início da FASE 03 ainda dependia de autorização, concedida no pedido atual.
- Commit local das FASES 00 e 01 autorizado pelo usuário em 21/10/2026. Push, PR e merge continuam sem autorização.
- FASE 03 implementada no worktree/branch `feat/fase-03-cooldown` e presente no commit local `4af4a98`, usado como base da FASE 03.1. `npm.cmd test`: linha de base 50/50; após a mudança 60/60. `test:performance`: 13/13; `test:camera`: 47/47. Sintaxe dos módulos e testes alterados, validação das specs, `git diff --check` e `git diff --cached --check` passaram. O arquivo preexistente não rastreado `package-lock.json` foi preservado.
- O cooldown de 900 ms e rearmamento de 250/300 ms são hipóteses; webcam real, experiência de jogadores, CPU/RAM total e acessibilidade visual ainda requerem avaliação.
- FASE 03.1: arbitragem estático/dinâmico e rearmamento de J/Z implementados neste worktree, ainda sem commit ou integração. Antes da correção, testes novos reproduziram D/I sem confirmação, D→Z/I→J sem rearmamento e confirmação residual Z→D/J→I. Depois da correção, `npm.cmd test`: 90/90; `test:performance`: 13/13; `test:camera`: 77/77. Próxima ação: revisão independente e validação com webcam real nos três modos, incluindo medição comparável de CPU/RAM. A FASE 03.2 e a FASE 04 não foram iniciadas.
