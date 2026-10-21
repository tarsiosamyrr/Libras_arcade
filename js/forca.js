/* ==========================================================================
   forca.js
   Motor do modo FORCA (jogo da forca clássico, jogado por sinais de Libras).
   Segue a mesma filosofia de game.js: não sabe nada de MediaPipe nem de DOM
   — só recebe "o jogador sinalizou a letra X" (via handleGuess) e mantém o
   estado da rodada, emitindo eventos para a UI reagir.

   Regra: uma palavra é sorteada; cada letra sinalizada é testada contra a
   palavra. Acertou, revela todas as ocorrências daquela letra. Errou, soma
   um "erro" e avança um traço no desenho da forca. Ao errar 6 vezes, a
   forca se completa (derrota da rodada); ao revelar todas as letras da
   palavra, a rodada é vencida. Em ambos os casos, o jogo sorteia a próxima
   palavra automaticamente após uma pequena pausa — sem "vidas", pra manter
   o foco em aprender/soletrar, não em punir (mesma filosofia do resto do
   jogo, ver README).
   ========================================================================== */

import { wordBank, hintFor } from "./data.js";

const BEST_KEY = 'libras-arcade:best-score-forca';
export const MAX_ERRORS = 6;      // partes do desenho: cabeça, tronco, 2 braços, 2 pernas
const ADVANCE_DELAY_MS = 1600;    // pausa após vitória/derrota, pra dar tempo do
                                    // desenho/feedback aparecer antes de trocar a palavra
const MAX_LEVEL = 5;               // mesmo teto de nível usado em game.js (ver data.js/WORDS)
const WINS_PER_LEVEL_UP = 3;       // a cada N palavras vencidas, sobe um nível automaticamente

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function uniqueLetters(word) {
  return [...new Set(word.split(''))];
}

export class ForcaGame extends EventTarget {
  constructor() {
    super();
    this.level = 1;
    this.score = 0;
    this.best = Number(localStorage.getItem(BEST_KEY) || 0);
    this.round = 0;
    this.wins = 0;
    this.winsSinceLevelUp = 0;

    this.word = null;
    this.guessed = new Set();  // todas as letras já tentadas nesta palavra (certas ou erradas)
    this.errors = 0;
    this.queue = [];
    this.status = 'idle';      // 'playing' | 'won' | 'lost'
  }

  /** Inicia uma sessão sem cronômetro; cada palavra mantém seu conjunto de palpites. */
  start(level = 1) {
    this.level = level;
    this.score = 0;
    this.round = 0;
    this.wins = 0;
    this.winsSinceLevelUp = 0;
    this.queue = shuffle(wordBank(level));
    this._nextWord();
    this.dispatchEvent(new CustomEvent('start', { detail: this._snapshot() }));
  }

  _nextWord() {
    if (this.queue.length === 0) this.queue = shuffle(wordBank(this.level));
    this.word = this.queue.shift();
    this.hint = hintFor(this.word);
    this.guessed = new Set();
    this.errors = 0;
    this.status = 'playing';
    this.round += 1;  
    this.dispatchEvent(new CustomEvent('newword', { detail: this._snapshot() }));
  }

  /** Chamado pela UI quando o LibrasEngine confirma uma letra sinalizada. */
  handleGuess(letter) {
    if (this.status !== 'playing') return;

    if (this.guessed.has(letter)) {
      this.dispatchEvent(new CustomEvent('repeated', { detail: { ...this._snapshot(), letter } }));
      return;
    }
    this.guessed.add(letter);

    if (this.word.includes(letter)) {
      this._onHit(letter);
    } else {
      this._onMiss(letter);
    }
  }

  _onHit(letter) {
    const occurrences = this.word.split('').filter((c) => c === letter).length;
    const gained = occurrences * 10;
    this.score += gained;

    const solved = uniqueLetters(this.word).every((c) => this.guessed.has(c));
    if (solved) {
      this._onWin();
    } else {
      this.dispatchEvent(new CustomEvent('hit', { detail: { ...this._snapshot(), letter, gained } }));
    }
  }

  _onMiss(letter) {
    this.errors += 1;
    if (this.errors >= MAX_ERRORS) {
      this._onLose(letter);
    } else {
      this.dispatchEvent(new CustomEvent('miss', { detail: { ...this._snapshot(), letter } }));
    }
  }

  _onWin() {
    this.status = 'won';
    this.wins += 1;
    const bonus = Math.max(10, 30 + this.word.length * 5 - this.errors * 5);
    this.score += bonus;
    this._saveBestIfNeeded();

    const leveledUp = this._registerWinForLevelUp();
    this.dispatchEvent(new CustomEvent('win', { detail: { ...this._snapshot(), bonus } }));
    if (leveledUp) this.dispatchEvent(new CustomEvent('levelup', { detail: this._snapshot() }));

    setTimeout(() => { if (this.status === 'won') this._nextWord(); }, ADVANCE_DELAY_MS);
  }

  _onLose(letter) {
    this.status = 'lost';
    this.dispatchEvent(new CustomEvent('lose', { detail: { ...this._snapshot(), letter } }));
    setTimeout(() => { if (this.status === 'lost') this._nextWord(); }, ADVANCE_DELAY_MS);
  }

  /** Igual ao esquema de game.js: a cada WINS_PER_LEVEL_UP palavras vencidas,
   *  sobe um nível (até MAX_LEVEL) e esvazia a fila, forçando a próxima
   *  palavra a vir do banco do novo nível. */
  _registerWinForLevelUp() {
    this.winsSinceLevelUp += 1;
    if (this.winsSinceLevelUp < WINS_PER_LEVEL_UP) return false;

    this.winsSinceLevelUp = 0;
    if (this.level >= MAX_LEVEL) return false;

    this.level += 1;
    this.queue = [];
    return true;
  }

  _saveBestIfNeeded() {
    if (this.score > this.best) {
      this.best = this.score;
      localStorage.setItem(BEST_KEY, String(this.best));
    }
  }

  /** Salva o recorde da Forca e volta a idle; timeouts de rodada não são cancelados. */
  end() {
    this._saveBestIfNeeded();
    this.dispatchEvent(new CustomEvent('sessionend', { detail: this._snapshot() }));
    this.status = 'idle';
  }

  _snapshot() {
    return {
      mode: 'forca',
      level: this.level,
      maxLevel: MAX_LEVEL,
      score: this.score,
      best: this.best,
      // "streak" aqui é reaproveitado como "palavras vencidas na sessão",
      // pra reusar o mesmo placar (topbar) e o mesmo painel de resultado
      // dos outros modos sem duplicar HTML/CSS.
      streak: this.wins,
      bestStreak: this.wins,
      round: this.round,
      wins: this.wins,
      word: this.word,
      hint: this.hint,
      guessed: [...this.guessed],
      errors: this.errors,
      maxErrors: MAX_ERRORS,
      status: this.status
    };
  }
}