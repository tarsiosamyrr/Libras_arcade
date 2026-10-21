# Memória técnica do Libras Arcade

Esta memória foi iniciada na auditoria de 20/10/2026. Não implica entrega das melhorias planejadas.

## Leitura e autoridade

1. [Capacidade principal](capabilities/core.md): contrato confirmado e lacunas de entrega.
2. [Sistema](system.md): arquitetura realmente implementada, a conferir no código.
3. [Testes](testing.md): comandos e evidências, incluindo limites da auditoria.
4. [Decisões abertas](open-decisions.md): perguntas que não podem ser resolvidas por suposição.
5. [Histórico](history.md): marcos; Git preserva detalhes das mudanças.
6. [Estado local](../docs/state.md): andamento e próxima ação.

O [README](../README.md) apresenta uso e requisitos; [AGENTS](../AGENTS.md) define políticas; o [roadmap](../docs/ROADMAP.md) concentra achados e planejamento. Código e verificações executadas têm autoridade sobre alegações de implementação. Um plano não altera o contrato nem comprova funcionalidade.

## Manutenção

Mudanças funcionais atualizam a capacidade; arquitetura altera `system.md`; evidências alteram `testing.md`. Decisões duradouras justificadas podem gerar ADR, quando houver decisão real. Não duplicar diagnóstico entre documentos nem marcar a capacidade como `verified` com base apenas em mocks. Esta entrega mantém o estado `partial`.
