# Libras Arcade | Auditoria do código da Fase 03.3B-1.2

**Data:** 24/10/2026  
**Fonte:** `fase-03-cooldown-gestos.zip` fornecido pelo usuário.  
**Natureza:** análise somente leitura. Nenhum arquivo do repositório foi alterado. Os experimentos complementares foram executados em scripts temporários fora da árvore do projeto.

## 1. Verificações

- Arquivo ZIP contém os oito módulos em `js/`, os testes e a documentação, mas **não inclui um histórico Git utilizável**. O item `.git` remete ao worktree original, inacessível na cópia extraída.
- `npm test`: 138 testes encontrados, 134 aprovados e quatro impossibilitados de executar porque o harness tenta `git show 9063154f5661c50fc7312059aa769709615b3e70:js/app.js` fora de um repositório Git. Essas quatro falhas **não são regressões funcionais demonstradas**. No repositório original, Codex relatou 138/138.
- `npm run test:camera`: **125/125 aprovados** nesta cópia.
- `node --check js/*.js`: todos os arquivos passaram.
- Não foram realizados testes físicos com câmera, benchmarking CPU/RAM, nem revisão por especialista em Libras.

## 2. Diagnóstico prioritário do J

### P0-A: haste excessivamente restritiva

`js/libras.js:665-689` exige **três passos consecutivos** com `dy > 0` e `abs(dx) <= dy * 0.25`. O eixo Y da imagem cresce para baixo. O critério admite pequena inclinação da haste e falha se qualquer um dos três passos violar o limite. Depende diretamente da amostragem após suavização.

**Reprodução independente:** usando a trajetória `J_PATH` já existente nos testes do projeto, a confirmação ocorreu sem inclinação e com 10°, mas **não ocorreu com inclinação adicional de 15°, 20°, 25°, 30° ou 40°**. Trata-se de um teste sintético adicional, não de um limite de inclinação homologado em webcam. A fixture anterior já cobria inclinações menores.

### P0-B: queda de amostras da haste/do gancho

`js/libras.js:1063-1123`: o buffer da trajetória só recebe pontos quando `activeKey` está presente. Se o rastreador mantém `_motionKey` durante uma perda breve da pose-base (graça de 300 ms), ele **mantém o histórico, mas não adiciona as posições observadas nessa perda**. Isso pode suprimir precisamente o retorno do gancho.

**Reprodução independente:** a mesma trajetória sintética confirmou J mantendo a pose-base em todos os frames. Ao simular perda temporária da pose-base durante os últimos 3 frames, o sinal deixou de confirmar, mesmo dentro da janela de graça. Em um desenho real, a pose-base pode oscilar por oclusão ou projeção.

### P0-C: sensibilidade à cadência

`vision.js:27, 199-205` limita a inferência nominalmente a uma amostra a cada 50 ms; a cadência efetiva pode ser menor. `libras.js:103-119` impõe janela de 1,3 s, suavização de três amostras, seis amostras mínimas, três passos descendentes e pisos independentes de ganho do gancho.

**Reprodução independente:** a trajetória sintética `J_PATH` confirma com 11 amostras e também com um subconjunto de sete amostras. Com apenas seis amostras uniformemente espaçadas no mesmo percurso, **não confirmou**, apesar de a geometria original da trajetória não ter mudado. Na última geometria registrada para esse caso, houve `stemDescent ≈ 0,4`, `hookRise = 0` e `shapeValid=false`.

### P1-D: referencial de coordenadas e escala variável

`js/libras.js:1109-1119` registra `tip.x / scale` e `tip.y / scale`, onde `scale = handScale(lm)` é recalculado **a cada frame** (`:156-158, :825`). Uma variação da escala projetada (distância, rotação, ruído) altera a posição normalizada mesmo quando a trajetória física permanece similar. O mesmo ocorre em `_observeMotionRearm` (`:1043-1060`). Recomenda-se testar uma escala **fixada no início de cada trajetória** ou um referencial estável, preservando o movimento global necessário a J/Z, antes de trocar a implementação. Não converter automaticamente a trajetória apenas para coordenadas relativas ao punho, pois isso pode remover o movimento global do sinal.

### P1-E: combinação de critérios e medição insuficiente

`js/libras.js:1180-1203` ainda exige: haste+gancho, ângulo mínimo de curva, curviness, deslocamento vertical líquido e consistência vertical. Um J verdadeiro pode falhar em qualquer uma dessas exigências, inclusive quando há gancho válido. O algoritmo só mede a geometria detalhada quando a calibração voluntária está ativa.

`hasJStemAndHook` zera `stemDescent`, `hookRise` e `hookSide` se não encontrar a haste (`:675-677`). **Zeros nesse caso significam 'a haste não foi encontrada pela regra'**, não necessariamente 'não existiu deslocamento físico'. Faltam diagnósticos de `maxStemRun`, `reason` de falha, geometria do gancho após perda da base e flags para cada condição de `validJ`.

## 3. Classificador estático

### P1-F: ambiguidades decididas pela ordem das regras

`js/libras.js:303-533, :566-589`: pontuação por média de regras heurísticas, seleção do maior escore estrito `>` e empate favorecendo a regra registrada primeiro. Não há mecanismo de margem para detectar decisões ambíguas.

- **A/O** (`:304-313`, `:358-365`): O verifica apenas três extensões e pinça polegar-médio, sem mindinho. Sobreposição e saturação em 1,0 observadas nos logs e nos testes.
- **I/Y** (`:340-346`, `:396-404`): o Y acrescenta o polegar à base de I, mas I pode continuar com 1,0 quando Y também atinge 1,0; a ordem favorece I.
- **P/V/K** (`:377-385`, `:447-456`, `:477-486`): V não avalia orientação, enquanto P/K incorporam direção como um de sete componentes da média. Isso permite V pontuar melhor que P orientado para baixo em certas configurações, como os logs mostraram.
- **C/B/F**, **G/T**, **E/M/N/S/T/R**: padrões frouxamente sobrepostos. Não aplicar penalidades ou trocar ordem arbitrariamente sem exemplos positivos e negativos de ambos os sinais.

### P1-G: lateralidade ignorada e orientação projetada

`js/vision.js:85-92` configura `numHands: 1`, e `:263-267` chama qualquer mão detectada de `right`. A orientação de G/Q/K/P/H/U vem de ângulos 2D em relação à imagem (`js/libras.js:175-179, :279-285`); o espelhamento da visualização não muda esses ângulos. A mão física é declarada apenas no rótulo manual de calibração. Isso é coerente com as assimetrias observadas, mas não basta para provar uma causa específica sem medir geometria.

### P2-H: guia pedagógico simplificado

`js/data.js:24-50` utiliza diagramas de cinco dedos 0/1 e dicas textuais; `js/ui.js:468-479` gera a mesma representação para formas muito diferentes. O próprio código reconhece esse limite. Há uma divergência documentada entre C e a condição geométrica do classificador. Mudanças de sinais/dicas devem passar por referência técnica em Libras.

## 4. Diagnóstico e testabilidade

### P1-I: dados de calibração incompletos para as seis letras problemáticas

`js/libras.js:535-542`: `CALIBRATION_RULES` contém A/B/C/F/G/I/K/O/P/T/V/Y. **Não inclui E, M, N, R ou S**, enquanto `CALIBRATION_FEATURES` não inclui `thumbPinkyMcp`, `thumbRingMcp`, `crossIM` nem `spreadMR`, usados justamente por regras que ainda falham. O painel atual serve aos grupos recém-investigados, mas **não está pronto para diagnosticar completamente E/M/N/S/T/R**.

### P2-J: eventos não equivalem a tentativas

`js/diagnostics.js:23-137` limita os registros a 120 eventos e amostra reconhecimento em geral a cada 200 ms. A captura rotulada é local, explícita e não armazena frames/landmarks, o que é positivo. Entretanto, `startCalibration`/`stopCalibration` não verificam se o usuário de fato fez uma única tentativa; eventos podem se sobrepor ou se perder por sobrescrita. Isso limita estimativas quantitativas. Atribuir uma ID por tentativa e registrar resumo de aceitação/falha e cortes do buffer ajudaria, sem armazenamento biométrico.

### P2-K: fixtures não modelam todos os casos físicos

`tests/app-ui.integration.test.cjs:11-61` define trajetórias ideais e landmarks artificiais, mudando sobretudo a posição da ponta do dedo. Não reproduz adequadamente oclusão, rotação tridimensional, perda de base na virada do gancho, variação de escala, lateralidade real ou decimação de frames. Testes automatizados aprovados devem ser complementados com negativos/positivos realistas e uma bateria de webcam.

## 5. Fluxo do jogo e arquitetura

- `js/vision.js`: separação útil do ciclo de câmera, modelo e único loop; limites de inferência e métricas. A captura é pequena (ideal 320×240; máximo 480×360), o que pode prejudicar landmarks em mãos distantes, mas o efeito não foi quantificado.
- `js/libras.js`: reconhece candidatos estáticos e J/Z, máquina `READY/STABILIZING/CONFIRMED/COOLDOWN/WAIT_RELEASE`; lógica temporal concentrada, porém com múltiplas variáveis de controle e regiões suscetíveis a interações.
- `js/ui.js:105-135`: `signconfirmed` é encaminhado ao motor ativo, que registra a aceitação/rejeição. A interface no Treino usa `resetTracking()` após navegação manual (`:456-460`), prevenindo a reutilização da pose anterior.
- `js/game.js:200-222`: Soletrar valida o sinal recebido contra `target[wordIndex]`; se a letra errada já veio do classificador, o Soletrar a rejeita corretamente. Não usar a letra esperada para corrigir a classificação da câmera.
- `js/libras.js:1241-1281`: gesto de retorno por deslocamento do punho é observado durante todas as tentativas, independentemente do estado do jogo. Uma movimentação lateral ampla pode disparar `navback` e interromper a sessão; risco a verificar especificamente com gestos dinâmicos.

## 6. Plano recomendado

**Etapa 1: testes de regressão negativos antes de editar a regra de J.** Adicionar cenários sintéticos com haste inclinada ≥15°, 6 frames úteis para um J curto, perda de pose-base durante o gancho, alterações de escala/projeção e gestos falsos semelhantes a I. Rodar contra a versão atual, registrar falhas e razão efetiva.

**Etapa 2: correção cirúrgica do J, separada das regras estáticas.** Preferir segmentação adaptativa de haste/gancho, tolerância a deriva lateral, sem exigir exatamente 3 passos consecutivos de câmera, preservar trajetória por alguns frames mesmo se a pose-base oscilar, e estabilizar o referencial de coordenadas. Não retornar cegamente à versão anterior, nem afrouxar indiscriminadamente os limiares.

**Etapa 3: medir o antes/depois.** I imóvel/oscilante e J lento/rápido/curto, duas mãos, vídeos com diferentes orientações; registrar sucesso, falso J por tentativa de I, J perdido, tempo até confirmação e impacto no Soletrar. Guardar resultados por tentativa, não apenas por evento.

**Etapa 4: abordar estáticas em grupos.** Primeiro O/A com mão e orientação; P/V/K; C/B/F; G/T. Só então expandir instrumentação e recuperar E/M/N/S/T/R. Validar a correspondência pedagógica antes de alterar dicas.

**Restrições:** nenhuma edição feita neste diagnóstico; não criar commit/push/merge; preservar `package-lock.json` não rastreado; as alterações futuras exigem trabalho no worktree original com histórico Git e revisão do diff.
