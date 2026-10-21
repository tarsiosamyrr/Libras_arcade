# Estado da entrega

- FASE 00 concluída: arquitetura e diagnóstico documentados; equivalência estrutural, dados, sintaxe, HTTP local e documentação verificados. Sem alteração funcional.
- A pasta não rastreada `Libras_arcade/` é preexistente e foi preservada.
- FASE 01 implementada e verificada automaticamente: métricas reais de inferência/FPS, loop único, Canvas, 13 testes e integração de navegador. [Relatório, diff resumido e evidências](performance/FASE01.md).
- Orca indisponível; usado subagente nativo de revisão, sem edição concorrente. Achado sobre métrica ao parar o loop foi reproduzido e corrigido.
- MediaPipe real medido com vídeo controlado sem mãos. Precisão por webcam, CPU/RAM total e matriz de dispositivos permanecem sem homologação.
- FASE 02 consolidada no commit local `fb22e89`, na branch `integracao/fase-02-camera`. O worktree `review/integracao-02` permanece separado e não foi alterado nesta tarefa.
- FASE 02.1: correções A-1/M-1 implementadas na branch atual por autorização explícita do usuário; commit local autorizado após revisão. Sem merge, cherry-pick ou push nesta tarefa. A pasta não rastreada `Libras_arcade/` permanece preservada.
- Suíte completa: 34/34 testes com `npm.cmd test` (25 anteriores + 9 novos); `npm.cmd run test:camera`: 21/21; `npm.cmd run test:performance`: 13/13. Testes de falha de armazenamento e sequência foram executados antes da correção e 7 falharam. Sintaxe dos sete módulos, `git diff --check` e validação documental aprovados.
- Webcam real, desempenho em hardware e mensagens da tela de erro da câmera não foram validados nesta fase. Próxima ação pendente de autorização: testes manuais com webcam e decisão sobre a fase seguinte; não iniciar a FASE 03 automaticamente.
- Commit local das FASES 00 e 01 autorizado pelo usuário em 21/10/2026. Push, PR e merge continuam sem autorização.
