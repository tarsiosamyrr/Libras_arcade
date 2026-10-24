---
id: CHG-20261024-fase-033b12-j-calibracao
status: implemented
date: 2026-10-24
affected_capabilities: core
---

# FASE 03.3B-1.2 — retorno do J e coleta escalar rotulada

## Problema e contexto

O [resumo dos 12 buffers de webcam](../../docs/qa/Libras_Arcade_Analise_12_Logs_24-10-2026.md) contém J emitido quando I era esperado nos anexos 2, 9 e 11. Os anexos 3 e 4 também mostram J verdadeiro aceito, inclusive rápido e com haste curta segundo o avaliador. Os JSON individuais e landmarks não estão disponíveis neste worktree. Os eventos capturados são trechos de um buffer de 120 posições, não tentativas independentes nem taxa de acerto.

No motor da 03.3B-1, três passos descendentes e curvatura global bastavam para a forma de J. Uma trajetória sintética com haste descendente seguida somente de deslocamento lateral emitia J, embora não tivesse retorno de gancho. Esse defeito foi reproduzido pelo caminho completo `LibrasEngine.update()` antes da mudança. Não é possível afirmar que o mesmo desenho ocorreu nos registros reais.

## Resultado esperado

Rejeitar a trajetória sem retorno, preservar I estático e J sintético lento, rápido, curto, inclinado e espelhado, sem mudar cooldown ou usar a letra esperada pelo jogo. Coletar apenas medidas escalares rotuladas que permitam investigar I/J, O/A, P/V, C/B e G/T com webcam real.

## Escopo

Geometria temporal local de J, API voluntária de calibração em memória, testes determinísticos e documentação dos pares de confusão.

## Não escopo

Recalibração de A/O, P/V, C/B, G/T, E/M/N/S/T/R, mudança pedagógica, novo modelo, cronômetro, persistência biométrica ou alteração da câmera.

## Alternativas e decisão

Alongar hold ou cooldown afetaria sinais válidos sem discriminar a geometria. Exigir apenas mais amostras de haste deixaria o desvio lateral válido como J. Escolhemos verificar a ordem **haste descendente → ponto mais baixo → retorno simultaneamente ascendente e lateral** na trajetória suavizada. A subida mínima 0,03 fica na fronteira do raio usado para considerar uma ponta estacionária; o deslocamento lateral mínimo 0,06 reutiliza a escala da intenção dinâmica. São hipóteses de software protegidas por fixtures, não valores homologados em webcam.

Para os pares estáticos, mudar a ordem das regras, impor orientação a V ou endurecer limiares com base nas contagens dos buffers poderia trocar o erro por outra confusão. Decidimos coletar features por tentativa rotulada antes de alterar essas regras.

## Solução e fluxo

`hasJStemAndHook()` procura três passos descendentes de deriva limitada, depois o ponto de maior coordenada vertical e o retorno final com subida e avanço lateral mínimos. Os critérios anteriores de caminho, curva, consistência e pose-base continuam necessários. Não há novo estado, timer ou buffer de movimento. O falso traço lateral deixa o hold de I voltar quando o movimento cessa.

`window.librasArcadeDiagnostics.startCalibration({ intendedLetter, physicalHand, orientation, distance, mirrored })` exige rótulos válidos e limpa o anel antes de **uma tentativa**. Mão: `left`/`right`; orientação: `front`/`oblique`/`side`; distância: `near`/`medium`/`far`; espelhamento: booleano. Esses rótulos vêm do avaliador, não de handedness inferido. A captura registra `calibration_start`, amostras `recognition` no limite anterior de 200 ms ou mudança de estado, `motion_geometry` de J em no máximo uma amostra por 200 ms e no instante de validação, além dos eventos de confirmação/decisão existentes. `stopCalibration()` interrompe a captura e mantém o anel para leitura consciente; `disable()` o apaga. Nova tentativa chama `startCalibration()` novamente e substitui a anterior. `read()` continua devolvendo cópias de até 120 eventos; não há download, gravação ou envio automático.

As amostras opcionais incluem extensão/curvatura de quatro dedos, distâncias relativas do polegar, separação indicador/médio, ângulos 2D e escores das regras A/B/C/F/G/I/K/O/P/T/V/Y. Para J, registram comprimento, deslocamento vertical líquido, curva, duração, descida da haste, subida e avanço lateral do gancho. `elapsedMs` em `signconfirmed` mede o tempo desde `startCalibration()`, não latência do MediaPipe nem duração de uma tentativa inferida. `shapeValid` descreve só a condição haste/gancho; `signconfirmed` comprova a confirmação. A coleta não recebe arrays de landmarks, imagem ou vídeo.

## Interfaces e dados afetados

O contrato `signconfirmed { letter }`, os jogos, Treino A–Z e `vision.js` não mudaram. `js/diagnostics.js` acrescenta início/fim da calibração e campos escalares permitidos; `js/app.js` expõe as duas chamadas no console. `js/libras.js` usa a condição adicional de J e anexa features/escores somente quando a captura rotulada está ativa. Nenhuma chave de armazenamento foi criada.

## Falhas, segurança e compatibilidade

Um J verdadeiro sem retorno ascendente observável poderá ser rejeitado; o relatório real não guarda a geometria para estimar quantos casos seriam afetados. O valor 0,03 foi escolhido também para preservar o instante da fixture histórica de J; não equivale a calibração com jogadores. Movimento involuntário geometricamente idêntico a J continuará indistinguível. O modo de calibração pode conter dados sensíveis derivados da mão, por isso exige ação explícita, permanece em memória e usa limite de 120 eventos; o avaliador deve revisar o resumo antes de compartilhá-lo. Não há inferência adicional de câmera, loop concorrente ou benchmark comparável de CPU/RAM.

## Estratégia de testes

O teste negativo da haste com desvio lateral falhou na base com J inesperado; após a mudança passou. Testes novos cobrem J curto em duas velocidades e espelhamentos, I com desvio inclinado/espelhado, emissão até o Soletrar, rótulos obrigatórios, amostras escalares, ausência de landmarks brutos, parada/limpeza e limitações de V e do empate A/O em fixtures. A suíte anterior cobre I imóvel e com oscilações, J lento/rápido/irregular, I→J, J→I, residual, D/Z, três modos, navegação e recursos. Os resultados finais e comandos ficam em [testing.md](../testing.md). Nenhum caso sintético mede precisão real.

## Critérios de aceite

Na entrada controlada, a haste sem retorno não emite J e pode terminar em I; as trajetórias J positivas mantêm confirmação única e o instante histórico; a captura desligada não registra features adicionais, a captura rotulada é limitada e as decisões do jogo são distinguíveis. A melhoria com webcam e a aceitação pedagógica exigem coleta voluntária separada por mão, orientação, distância e velocidade, com denominadores por tentativa.

## Consolidação na memória viva

[Capacidade](../capabilities/core.md), [sistema](../system.md), [testes](../testing.md), [README](../../README.md), [roadmap](../../docs/ROADMAP.md), [QA](../../docs/qa/qa-reconhecimento.md) e [estado local](../../docs/state.md).
