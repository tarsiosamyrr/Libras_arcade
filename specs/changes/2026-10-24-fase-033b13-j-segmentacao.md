---
id: CHG-20261024-fase-033b13-j-segmentacao
status: implemented
date: 2026-10-24
affected_capabilities: core
---

# FASE 03.3B-1.3 — segmentação e continuidade do J

## Problema e contexto

O usuário relatou I mais estável, mas J difícil com webcam após a 03.3B-1.2. A [auditoria independente](../../docs/qa/Libras_Arcade_Auditoria_Codigo_Atual_2026-10-24.md) identificou a exigência de três passos descendentes consecutivos com deriva lateral ≤0,25 por passo, a perda de pontos quando a pose I some durante o gancho e a divisão da ponta pela escala recalculada a cada frame. A auditoria foi feita em ZIP sem histórico Git utilizável; no worktree original a linha de base foi 138/138.

Antes da mudança, fixtures no caminho completo `LibrasEngine.update()` falharam para J inclinado a 15°, J com perda da base nos três pontos finais e J com zoom alternado de ±8% em torno do pulso. J com sete amostras e intervalos irregulares já passava. Seis amostras decimadas da trajetória antiga não preservavam o retorno após suavização; não se deve aprovar uma forma sem evidência do gancho. Essas reproduções não são landmarks de webcam nem medição de precisão.

## Resultado esperado

Reconhecer um J cuja haste desça de forma predominante, mesmo inclinada ou amostrada irregularmente, seguido de retorno ascendente e lateral observável. Conservar a confirmação única, o hold de I e os negativos de falso J.

## Escopo

Segmentação e rastreamento de J, diagnóstico escalar opcional, fixtures de regressão e documentação.

## Não escopo

Z, regras estáticas, jogos, câmera, cooldown, cronômetro, conteúdo pedagógico e classificação por alvo esperado mantêm seus contratos.

## Solução e fluxo

`jShapeRejection()` localiza o ponto de maior Y na trajetória suavizada. O trecho inicial é a haste; o trecho posterior é o gancho. A haste precisa descer pelo menos 0,26 na escala normalizada da mão, ter deslocamento vertical líquido maior que o lateral e consistência vertical ≥0,65. Não exige mais três passos consecutivos; `J_STEM_MIN_STEPS` foi removido e a razão lateral/descida passou de 0,25 por passo para 1,0 **no segmento inteiro**. Isso significa predominância vertical, não autorização para qualquer curva acumulada. O gancho mantém subida ≥0,03 e avanço lateral ≥0,06. Permanecem pelo menos seis amostras, percurso ≥0,26, curva ≥35°, percurso/reta ≥1,15, deslocamento vertical líquido ≥0,10, consistência global ≥0,65, janela de 1.300 ms e suavização por três amostras. A ordem haste → ponto inferior → retorno continua obrigatória. J invertido, apenas lateral, apenas vertical e vai-e-vem incoerente permanecem negativos nas fixtures.

O ponto inferior e a regra de predominância vertical são hipóteses de engenharia; J físico com haste quase horizontal ou gancho pouco visível ainda pode ser rejeitado. Uma oscilação involuntária que satisfaça a mesma geometria e tempo ainda pode produzir falso J. Os valores não são calibração linguística ou estatística.

### Continuidade e referencial

Com pose-base I ausente, o rastreador só acrescenta pontos se `_motionKey` já for J, houver intenção em andamento e a última pose-base tiver ocorrido há no máximo 300 ms. Não inicia J nessa condição. O pulso de cada observação J deve permanecer a até 0,26 da última posição normalizada; salto maior descarta o buffer. Perda da mão ou ausência de callbacks acima da graça também descarta. Confirmação, `resetTracking()`, troca de sessão e pausa limpam as novas referências junto do buffer antigo. A limitação `numHands: 1` não fornece identidade física persistente: mãos sobrepostas ou próximas não podem ser distinguidas com garantia.

Para J, o ponto analisado é `pulso / escalaInicial + (ponta − pulso) / escalaAtual`. O primeiro termo conserva a translação global do pulso; o segundo reduz a distorção causada por zoom uniforme da mão. A escala inicial pertence apenas à trajetória atual. Não se migrou para coordenadas só relativas ao pulso, pois isso descartaria movimento global necessário ao gesto. Z conserva `ponta / escalaAtual` e seus testes positivos e negativos.

## Interfaces e dados afetados

Na calibração voluntária, `motion_geometry` registra amostras, percurso, duração e curva mesmo antes da elegibilidade geométrica. Depois registra descida e desvio da haste, consistência, maior sequência descendente, subida e lado do gancho, com `reason` da primeira condição que falhou ou `accepted`. Descida observada não é zerada quando a haste falha. `motion_base_lost` indica a interrupção breve da pose; `motion_rejected` distingue histórico obsoleto e salto espacial. A amostragem continua limitada a 200 ms ou mudança de motivo. O anel mantém 120 eventos escalares, sem imagem, vídeo, landmarks completos, persistência ou transmissão. A coleta continua desligada por padrão. `reason` de uma amostra intermediária não resume toda a tentativa.

## Alternativas e decisão

- Aumentar cooldown/hold atrasaria I e J sem distinguir a trajetória; não foi adotado.
- Aceitar qualquer descida mais curva voltaria ao falso J lateral da 03.3B-1.2; o retorno ascendente/lateral foi mantido.
- Normalizar só por punho eliminaria parte do movimento global; foi usada a soma de deslocamento global e posição relativa.
- Aplicar o referencial a Z ampliaria o escopo sem falha demonstrada; Z foi preservado.

## Falhas, segurança e compatibilidade

O rastreador ainda depende da projeção 2D, de uma única mão e da cadência efetiva do MediaPipe. Um salto legítimo do pulso acima do limite entre amostras pode ser descartado. Seis pontos podem bastar quando o gancho permanece nítido após suavização, mas seis pontos decimados que o apagam não bastam. Custo CPU/RAM comparável e efeito na webcam não foram medidos.

## Estratégia de testes

O harness existente testa pelo `update()` inclinação/espelhamento, seis e sete amostras, cadência irregular, perda curta de base, escala variável, I imóvel e vertical, salto espacial, histórico velho, chegada do J ao Treino/Soletrar e controles históricos I↔J, J verdadeiro, D/Z, cooldown e sessão. A suíte completa e os comandos ficam em [testing.md](../testing.md).

## Critérios de aceite

Nas fixtures, J inclinado, curto e com perda breve de base confirma uma vez; I estático, sem gancho e com oscilação não vira J; Z e os três jogos não regridem. A homologação depende de tentativas rotuladas independentes com ambas as mãos, velocidades, orientações e distâncias, medindo J aceito/perdido, falso J por tentativa de I, tempo, fase de perda e decisão do jogo. Comparar no mesmo dispositivo e condições com a versão anterior; submeter a review independente antes de aprovar.

## Consolidação na memória viva

[Capacidade](../capabilities/core.md), [sistema](../system.md), [testes](../testing.md), [README](../../README.md), [roadmap](../../docs/ROADMAP.md), [QA](../../docs/qa/qa-reconhecimento.md) e [estado](../../docs/state.md).
