/* ==========================================================================
   game.js
   Motor de gamificação dos modos TREINO e SOLETRAR. Não sabe nada de
   MediaPipe nem de DOM — só recebe "o jogador sinalizou a letra X" (via
   handleSign) e mantém o estado do jogo, emitindo eventos para a UI reagir.
   (O modo FORCA tem seu próprio motor, ver forca.js.)
   ========================================================================== */

import { LETTERS, LETTER_POOL, wordBank } from "./data.js";

const BEST_KEY = 'libras-arcade:best-score';
// Tempos por rodada calibrados para o alfabeto completo (26 letras) e os
// gestos de MOVIMENTO (J, Z — que exigem primeiro formar a pose-base e só
// depois desenhar o trajeto no ar): o tempo padrão da v1 ficava curto
// demais, especialmente no Modo Soletrar, onde o jogador ainda precisa
// localizar mentalmente a próxima letra da palavra antes de sinalizar.
const ROUND_MS_BASE = 12000;      // tempo por letra no nível 1
const ROUND_MS_STEP = 700;        // quanto o tempo cai a cada nível acima do 1
const ROUND_MS_MIN = 6000;        // piso — com J/Z e letras difíceis, menos vira frustração
const WORD_MODE_BONUS_MS = 2500;  // tempo extra por letra, só no Modo Soletrar
const ADVANCE_DELAY_MS = 450; // pausa após acerto/palavra completa, pra dar
                                // tempo do feedback visual (flash verde) aparecer
                                // antes de trocar o alvo na tela
const MAX_LEVEL = 5;          // maior nível existente em data.js (WORDS / difficulty)
const HITS_PER_LEVEL_UP = 5;  // a cada N acertos, sobe um nível automaticamente

// nível 1 = ROUND_MS_BASE, cada nível acima tira ROUND_MS_STEP ms, até o piso.
// é o que faz os níveis 4 e 5 serem desafiadores mesmo já usando o alfabeto
// completo desde o nível 3: o desafio vira velocidade, não letras novas.
// no Modo Soletrar, soma-se ainda WORD_MODE_BONUS_MS por letra.
function roundMsForLevel(level, mode) {
  const base = Math.max(ROUND_MS_MIN, ROUND_MS_BASE - (level - 1) * ROUND_MS_STEP);
  return mode === 'word' ? base + WORD_MODE_BONUS_MS : base;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class Game extends EventTarget {
  constructor() {
    super();
    this.mode = null;          // 'practice' | 'word'
    this.level = 1;
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.round = 0;
    this.best = this._readBest() ?? 0;

    this.target = null;        // letra alvo atual (practice) ou palavra atual (word)
    this.wordIndex = 0;        // posição da letra dentro da palavra (word mode)
    this.queue = [];           // fila de letras/palavras restantes
    this.practiceSet = 'level'; // 'level' mantém sorteio pedagógico; 'all' percorre A–Z
    this.practiceLetters = [];
    this.practiceIndex = -1;
    this.practiceHistory = [];
    this.practiceHistoryIndex = -1;
    this.hitsSinceLevelUp = 0; // acertos desde a última subida de nível

    this._timerId = null;
    this._advanceId = null;
    this._advanceAction = null;
    this._advanceRemaining = 0;
    this._advanceDueAt = 0;
    this._paused = false;
    this._resumeTimer = false;
    this.timeLeft = 0;
  }

  /* -------------------------------------------------------- practice --- */
  /** Inicia Treino por nível ou com 'all' para validar A–Z em ordem, sem alterar os níveis. */
  startPractice(level = 1) {
    this._clearActivity();
    this._paused = false;
    this.mode = 'practice';
    this.practiceSet = level === 'all' ? 'all' : 'level';
    this.level = this.practiceSet === 'all' ? 1 : level;
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.round = 0;
    this.hitsSinceLevelUp = 0;
    this.practiceLetters = this.practiceSet === 'all' ? [...LETTER_POOL].sort() : [];
    this.practiceIndex = -1;
    this.practiceHistory = [];
    this.practiceHistoryIndex = -1;
    const pool = LETTER_POOL.filter((l) => LETTERS[l].difficulty <= this.level);
    this.queue = this.practiceSet === 'all' ? [] : shuffle(pool.length ? pool : LETTER_POOL);
    this._nextPracticeTarget();
    this.dispatchEvent(new CustomEvent('start', { detail: this._snapshot() }));
  }

  _nextPracticeTarget() {
    if (this.practiceSet === 'all') {
      this.practiceIndex = (this.practiceIndex + 1) % this.practiceLetters.length;
      this._setPracticeTarget(this.practiceLetters[this.practiceIndex]);
      return;
    }
    if (this.queue.length === 0) {
      const pool = LETTER_POOL.filter((l) => LETTERS[l].difficulty <= this.level);
      this.queue = shuffle(pool.length ? pool : LETTER_POOL);
    }
    this.practiceHistory.length = this.practiceHistoryIndex + 1;
    this._setPracticeTarget(this.queue.shift());
  }

  _setPracticeTarget(letter) {
    if (this.practiceSet === 'level' && this.practiceHistoryIndex === this.practiceHistory.length - 1) {
      this.practiceHistory.push(letter);
      // O histórico serve somente à navegação manual; limite fixo evita crescimento em sessões longas.
      if (this.practiceHistory.length > 52) this.practiceHistory.shift();
      this.practiceHistoryIndex = this.practiceHistory.length - 1;
    }
    this.target = letter;
    this.round += 1;
    this._startTimer();
    this.dispatchEvent(new CustomEvent('newtarget', { detail: this._snapshot() }));
  }

  /** Troca o alvo do Treino; A–Z é circular, enquanto níveis preservam sorteio e histórico.
   * Cancela o avanço pendente e reinicia o cronômetro sem alterar placar ou sequência.
   */
  navigatePracticeTarget(destination = 1) {
    if (this.mode !== 'practice' || this._paused) return false;
    if (this.practiceSet === 'all') {
      const size = this.practiceLetters.length;
      const index = typeof destination === 'string'
        ? this.practiceLetters.indexOf(destination)
        : (destination === 1 || destination === -1)
          ? (this.practiceIndex + destination + size) % size
          : -1;
      if (index < 0) return false;
      this._clearAdvance();
      this.practiceIndex = index;
      this._setPracticeTarget(this.practiceLetters[index]);
      return true;
    }
    const pool = LETTER_POOL.filter((letter) => LETTERS[letter].difficulty <= this.level);
    if (typeof destination === 'string' && !pool.includes(destination)) return false;
    if (destination === -1 && this.practiceHistoryIndex < 1) return false;
    if (destination !== 1 && destination !== -1 && typeof destination !== 'string') return false;
    this._clearAdvance();
    if (destination === -1) {
      this.practiceHistoryIndex -= 1;
      this._setPracticeTarget(this.practiceHistory[this.practiceHistoryIndex]);
    } else if (destination === 1 && this.practiceHistoryIndex < this.practiceHistory.length - 1) {
      this.practiceHistoryIndex += 1;
      this._setPracticeTarget(this.practiceHistory[this.practiceHistoryIndex]);
    } else if (typeof destination === 'string') {
      this.practiceHistory.length = this.practiceHistoryIndex + 1;
      this._setPracticeTarget(destination);
    } else {
      this._nextPracticeTarget();
    }
    return true;
  }

  /** Compatibilidade com o botão Próxima letra da FASE 03.1.2. */
  skipPracticeTarget() {
    return this.navigatePracticeTarget(1);
  }

  /* ------------------------------------------------------------ word --- */
  /** Inicia Soletrar com sequência própria da sessão; o cronômetro é renovado por letra. */
  startWord(level = 1) {
    this._clearActivity();
    this._paused = false;
    this.mode = 'word';
    this.practiceSet = 'level';
    this.practiceLetters = [];
    this.practiceIndex = -1;
    this.practiceHistory = [];
    this.practiceHistoryIndex = -1;
    this.level = level;
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.round = 0;
    this.hitsSinceLevelUp = 0;
    this.queue = shuffle(wordBank(level));
    this._nextWord();
    this.dispatchEvent(new CustomEvent('start', { detail: this._snapshot() }));
  }

  _nextWord() {
    if (this.queue.length === 0) this.queue = shuffle(wordBank(this.level));
    this.target = this.queue.shift();
    this.wordIndex = 0;
    this.round += 1;
    this._startTimer();
    this.dispatchEvent(new CustomEvent('newtarget', { detail: this._snapshot() }));
  }

  /* --------------------------------------------------- entrada do jogo --- */
  /** Chamado pela UI quando o LibrasEngine confirma uma letra sinalizada. */
  handleSign(letter) {
    if (!this.mode || this._paused || !this._timerId) return;

    const expected = this.mode === 'practice'
      ? this.target
      : this.target[this.wordIndex];

    if (letter === expected) {
      this._onCorrectLetter();
    } else {
      this._onWrongLetter(letter, expected);
    }
  }

  _onCorrectLetter() {
    this.streak += 1;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    const multiplier = 1 + Math.min(4, Math.floor(this.streak / 3)) * 0.25;
    const gained = Math.round(10 * multiplier);
    this.score += gained;

    const leveledUp = this._registerHitForLevelUp();

    if (this.mode === 'practice') {
      this.dispatchEvent(new CustomEvent('correct', { detail: { ...this._snapshot(), gained } }));
      if (leveledUp) this.dispatchEvent(new CustomEvent('levelup', { detail: this._snapshot() }));
      this._stopTimer();
      this._scheduleAdvance(() => { if (this.mode === 'practice') this._nextPracticeTarget(); }, ADVANCE_DELAY_MS);
    } else {
      this.wordIndex += 1;
      if (this.wordIndex >= this.target.length) {
        const bonus = 20 + this.target.length * 5;
        this.score += bonus;
        this.dispatchEvent(new CustomEvent('wordcomplete', { detail: { ...this._snapshot(), bonus } }));
        if (leveledUp) this.dispatchEvent(new CustomEvent('levelup', { detail: this._snapshot() }));
        this._stopTimer();
        this._scheduleAdvance(() => { if (this.mode === 'word') this._nextWord(); }, ADVANCE_DELAY_MS);
      } else {
        this.dispatchEvent(new CustomEvent('correct', { detail: { ...this._snapshot(), gained } }));
        if (leveledUp) this.dispatchEvent(new CustomEvent('levelup', { detail: this._snapshot() }));
        this._startTimer();
      }
    }
  }

  /** Conta mais um acerto para a barra de progresso de nível; a cada
   *  HITS_PER_LEVEL_UP acertos, sobe um nível (até MAX_LEVEL) e esvazia a
   *  fila atual, forçando o próximo alvo a ser sorteado já do pool/banco de
   *  palavras do novo nível. Retorna true se subiu de nível neste acerto. */
  _registerHitForLevelUp() {
    if (this.mode === 'practice' && this.practiceSet === 'all') return false;
    this.hitsSinceLevelUp += 1;
    if (this.hitsSinceLevelUp < HITS_PER_LEVEL_UP) return false;

    this.hitsSinceLevelUp = 0;
    if (this.level >= MAX_LEVEL) return false; // já no nível máximo, só zera o contador

    this.level += 1;
    this.queue = []; // força regenerar o pool/banco de palavras com o novo nível no próximo alvo
    return true;
  }

  _onWrongLetter(got, expected) {
    this.streak = 0;
    this.dispatchEvent(new CustomEvent('wrong', { detail: { ...this._snapshot(), got, expected } }));
  }

  /* ----------------------------------------------------------- timer --- */
  _startTimer() {
    this._stopTimer();
    this._roundMs = roundMsForLevel(this.level, this.mode);
    this.timeLeft = this._roundMs;
    this._runTimer();
  }

  _runTimer() {
    // Usa o tempo já restante após retomada; _startTimer é o único reset de rodada.
    if (this._paused || !this.mode || this._timerId) return;
    const tickMs = 100;
    this._timerId = setInterval(() => {
      this.timeLeft -= tickMs;
      this.dispatchEvent(new CustomEvent('tick', { detail: { timeLeft: this.timeLeft, ratio: Math.max(0, this.timeLeft / this._roundMs) } }));
      if (this.timeLeft <= 0) {
        this._stopTimer();
        this.streak = 0;
        const mode = this.mode;
        this.dispatchEvent(new CustomEvent('timeout', { detail: this._snapshot() }));
        this._scheduleAdvance(() => {
          if (this.mode !== mode) return;
          if (mode === 'practice') this._nextPracticeTarget();
          else this._nextWord();
        }, ADVANCE_DELAY_MS);
      }
    }, tickMs);
  }

  _stopTimer() {
    if (this._timerId !== null) clearInterval(this._timerId);
    this._timerId = null;
  }

  /** Um único avanço pendente por rodada; pausa conserva somente o atraso restante. */
  _scheduleAdvance(action, delay) {
    this._clearAdvance();
    this._advanceAction = action;
    this._advanceRemaining = delay;
    if (!this._paused) this._armAdvance();
  }

  _armAdvance() {
    this._advanceDueAt = Date.now() + this._advanceRemaining;
    this._advanceId = setTimeout(() => {
      const action = this._advanceAction;
      this._clearAdvance();
      if (!this._paused) action?.();
    }, this._advanceRemaining);
  }

  _clearAdvance() {
    if (this._advanceId !== null) clearTimeout(this._advanceId);
    this._advanceId = null;
    this._advanceAction = null;
    this._advanceRemaining = 0;
  }

  _clearActivity() {
    this._stopTimer();
    this._clearAdvance();
    this._resumeTimer = false;
  }

  /** Congela tanto o cronômetro quanto o feedback antes do próximo alvo. */
  pause() {
    if (this._paused) return;
    this._paused = true;
    const wasTiming = this._timerId !== null;
    this._stopTimer();
    this._resumeTimer = wasTiming;
    if (this._advanceId !== null) {
      this._advanceRemaining = Math.max(0, this._advanceDueAt - Date.now());
      clearTimeout(this._advanceId);
      this._advanceId = null;
    }
  }

  /** Reativa apenas o trabalho que estava pendente antes da pausa. */
  resume() {
    if (!this._paused) return;
    this._paused = false;
    if (this._resumeTimer) this._runTimer();
    this._resumeTimer = false;
    if (this._advanceAction) this._armAdvance();
  }

  /* ------------------------------------------------------------- fim --- */
  /** Lê o recorde; uma falha deixa a sessão utilizável e é registrada no console. */
  _readBest() {
    try {
      const value = Number(localStorage.getItem(BEST_KEY) || 0);
      return Number.isFinite(value) && value >= 0 ? value : 0;
    } catch (error) {
      console.warn('Não foi possível ler o recorde de Treino/Soletrar.', error);
      return null;
    }
  }

  /** Concilia memória e armazenamento antes de gravar; falhas são tentadas no próximo fim. */
  _saveBestIfNeeded() {
    this.best = Math.max(this.best, this.score);
    const storedBest = this._readBest();
    if (storedBest === null) return;
    this.best = Math.max(this.best, storedBest);
    if (this.best <= storedBest) return;
    try {
      localStorage.setItem(BEST_KEY, String(this.best));
    } catch (error) {
      console.warn('Não foi possível salvar o recorde de Treino/Soletrar.', error);
    }
  }

  /** Cancela intervalo e avanço pendente; tenta salvar sem bloquear o fim da sessão. */
  end() {
    this._clearActivity();
    this._paused = false;
    this._saveBestIfNeeded();
    this.dispatchEvent(new CustomEvent('sessionend', { detail: this._snapshot() }));
    this.mode = null;
  }

  _snapshot() {
    return {
      mode: this.mode,
      level: this.level,
      maxLevel: MAX_LEVEL,
      hitsSinceLevelUp: this.hitsSinceLevelUp,
      hitsPerLevelUp: HITS_PER_LEVEL_UP,
      score: this.score,
      best: this.best,
      streak: this.streak,
      bestStreak: this.bestStreak,
      round: this.round,
      target: this.target,
      practiceSet: this.mode === 'practice' ? this.practiceSet : null,
      practicePosition: this.mode === 'practice' && this.practiceSet === 'all' ? this.practiceIndex + 1 : null,
      practiceCount: this.mode === 'practice' && this.practiceSet === 'all' ? this.practiceLetters.length : null,
      wordIndex: this.wordIndex,
      timeLeft: this.timeLeft
    };
  }
}
