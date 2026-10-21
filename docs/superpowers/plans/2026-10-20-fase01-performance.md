# Plano de implementação — FASE 01

**Objetivo:** corrigir medição e reduzir trabalho redundante em `vision.js`/`app.js`, preservando configuração e sequência de reconhecimento.
**Autorização:** solicitação explícita da FASE 01; sem commit, push, PR ou início da FASE 02.
**Arquitetura:** manter módulos ES e o callback síncrono. Medir inferência e consumidor separadamente; expor snapshot de diagnóstico sem armazenar imagens/landmarks. Não adicionar framework ou bundler.
**Stack:** JavaScript, Node test runner/VM, Edge/Playwright disponível no ambiente e MediaPipe 0.10.14 existente.

## Tarefas sequenciais

- [x] Ler regras, preservar snapshot externo da árvore inicial e consultar documentação primária das alternativas.
- [x] Criar testes específicos do loop e Canvas e confirmar falhas na implementação atual.
- [x] Executar benchmark inicial com relógio real e MediaPipe no navegador; registrar ambiente e limites da entrada controlada.
- [x] Implementar FPS de janela móvel de 1 s, duração de inferência/consumidor e estatísticas limitadas a 120 amostras. Registrar callbacks, frames e motivos de descarte; calcular percentis apenas ao consultar snapshot.
- [x] Preservar rAF, limite de 50 ms, deduplicação de `currentTime` e timestamps usados pelo detector. Manter uma cadeia ativa e cancelamento consistente, restritos ao loop.
- [x] Evitar reset de Canvas se dimensões não mudaram e limpeza repetida quando já estiver vazio; limpar imediatamente ao desaparecer a mão. Não mudar geometria, cores ou regras de navegação.
- [x] Comparar baseline e alteração nos mesmos cenários; avaliar rVFC com teto de 50 ms e custo/viabilidade de Worker, sem adotar automaticamente.
- [x] Executar regressões de loop, desenho e três jogos, revisar diff e atualizar README/AGENTS/specs/roadmap.

## Alternativas e aceite

1. **rAF preservado + trabalho redundante removido:** menor risco à cadência de J/Z; recomendação inicial, sujeita às medições.
2. **rVFC:** reduz callbacks sem frame novo, mas um vídeo de 30 Hz com intervalo mínimo de 50 ms pode cair a 15 inferências/s. Comparar antes de mudar amostragem.
3. **Worker:** tira a chamada síncrona da UI, mas exige captura/transferência, modelo/GPU próprios, descarte de bitmaps e controle de mensagens em voo. Medir custo e verificar versão fixa antes de considerar integração.

Aceite: métricas com unidade/janela inequívocas, benchmark reproduzível antes/depois, invariantes dos jogos/modelo/classificador preservados e limites de validação explícitos. Testes desta tarefa são focados na mudança; a suíte abrangente da FASE 05 e o ciclo completo de câmera da FASE 02 continuam fora do escopo.
