# Fase 02 — ciclo de vida da câmera e dos recursos

## Decisões

- `vision.js` é o único responsável pelo `MediaStream`, pelo `HandLandmarker` e pelo loop de inferência. Inicializações concorrentes compartilham a mesma operação; gerações invalidam resultados que chegam depois de um encerramento.
- Ao ocultar a aba, o app cancela o loop, para todas as trilhas, retira o `srcObject` do vídeo e limpa gestos parciais. O modelo permanece carregado para a retomada. Em `pagehide`, o modelo é fechado para liberar WASM/GPU. Uma página restaurada do cache do navegador carrega o modelo novamente.
- O cronômetro de Treino e Soletrar congela com a aba oculta. O atraso de avanço da rodada é preservado em todos os modos. Sair ou iniciar outra sessão cancela o atraso anterior.
- A câmera continua ativa ao trocar entre menu e modos, pois a navegação no menu também usa gestos. A troca limpa o estado de reconhecimento para que um sinal iniciado em uma tela não confirme na próxima.
- Falhas de permissão, ausência ou indisponibilidade da câmera são exibidas com opção de tentar novamente. A interface e seus listeners são criados uma só vez, inclusive após erro ou retomada.

## Evidência e validação

Execute `node --test tests/phase02.test.mjs` para verificar concorrência, descarte de trilhas, cancelamento durante inicialização, falha de reprodução, unicidade do loop, falha de inferência e temporizadores. O teste usa substitutos locais para webcam e MediaPipe; não mede desempenho ou compatibilidade de hardware.

Com uma câmera real, validar em `localhost` ou HTTPS: conceder e negar permissão; desconectar a câmera; alternar aba durante a solicitação de permissão, durante uma rodada e durante o feedback de Forca; voltar à aba; navegar repetidamente entre Treino, Soletrar, Forca e menu; usar Sair e retornar; verificar que o indicador físico da câmera apaga ao ocultar a aba e ao fechar a página. Conferir também o comportamento de restauração pelo botão Voltar do navegador.
