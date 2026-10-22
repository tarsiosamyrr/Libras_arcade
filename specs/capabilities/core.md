---
id: core
contract_status: confirmed
implementation_status: partial
last_verified: 2026-10-22
last_verified_ref: working-tree-fase03-automated
---

# Prática de datilologia nos três jogos

## Finalidade e limites

Oferecer Treino, Soletrar e Forca mediante reconhecimento local de sinais, preservando identidade visual e proposta pedagógica. O contrato foi confirmado pelo prompt mestre do usuário. A auditoria não autoriza expandir funcionalidades ou iniciar fases futuras.

## Atores, permissões, entradas e resultados

Jogador concede acesso à webcam e navega por controles ou gestos. Landmarks alimentam o classificador e letras confirmadas alimentam o modo ativo. Saídas incluem alvo, dica, progresso, feedback, pontuação e recorde local. A execução precisa dos recursos remotos de visão/fontes quando ausentes do cache.

## Contrato comportamental e critérios de aceite

- Manter os três modos e seus feedbacks documentados no [README](../../README.md).
- Preservar processamento local e não gravar imagens/biometria automaticamente.
- Não confundir cobertura nominal com precisão ou validação pedagógica.
- Evoluir em fases autorizadas, com evidência e documentação de riscos. FASE 00 foi documental; FASE 01 instrumentou e removeu trabalho redundante; a FASE 02 acrescentou pausa, retomada, cancelamento e descarte de recursos; a FASE 02.1 trata falhas de armazenamento e reinicia estatísticas por sessão; a FASE 03 controla confirmação única, cooldown e rearmamento sem pausar a inferência.

## Invariantes e regras de negócio

Treino compara uma letra; Soletrar recebe uma sequência e premia palavra completa; Forca revela ocorrências e limita a rodada a seis erros. Repetições de palpite não adicionam erros na Forca. São regras do código auditado; fórmulas e transições estão em [system.md](../system.md).

## Estado atual e lacunas

Os motores e o classificador estão implementados, com cobertura nominal A–Z e 90 palavras. A FASE 01 corrigiu FPS e otimizou loop/Canvas com comparação controlada. A FASE 02 controla stream, modelo, loop, atrasos de rodada e pausa dos jogos. A FASE 02.1 mantém o jogo utilizável quando o armazenamento falha e zera a melhor sequência ao iniciar Treino/Soletrar. A FASE 03 impede repetição automática da pose e mostra a preparação da próxima letra em cenários simulados. Fluxo de ranking/resultados, acessibilidade, validação com webcam e validade do reconhecimento possuem lacunas. A capacidade permanece `partial`; testes sintéticos não validam o uso real com câmera.

## Evidências de implementação e teste

Implementação: [Game](../../js/game.js), [ForcaGame](../../js/forca.js), [LibrasEngine](../../js/libras.js) e [UI](../../js/ui.js). A inspeção incluiu todos os módulos da raiz e seus dados. Comandos, cenários reproduzidos e limitações estão em [testing.md](../testing.md). `last_verified` representa inspeção do estado, não homologação do reconhecimento.

## Relações

[Roadmap](../../docs/ROADMAP.md), [decisões abertas](../open-decisions.md), [AGENTS](../../AGENTS.md) e [mudança da FASE 01](../changes/2026-10-20-performance.md). A arquitetura principal foi preservada.
