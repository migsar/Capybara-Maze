import { Language } from './types';

export const CELL_SIZE = 32;
export const BOARD_WIDTH = 21;
export const BOARD_HEIGHT = 15;

// Visual Palette derived from the reference image
export const PALETTE = {
  BUSH_MAIN: '#2d5a27',
  BUSH_LIGHT: '#4a8b3c',
  BUSH_DARK: '#1a3318',
  DIRT_BG: '#dcb159', // Sand/Dirt base
  DIRT_NOISE: '#c29a48',
  WATER_MAIN: '#4fa4b8',
  WATER_LIGHT: '#a8d9e3',
  CAPYBARA: '#8c6239',
  JAGUAR: '#eab308',
  CROC: '#15803d',
  GATE: '#5d4037',
  TREAT: '#ef4444',
  UI_BG: '#000000',
  UI_TEXT: '#ffffff'
};

export const TRANSLATIONS = {
  [Language.EN_US]: {
    start: "START GAME",
    config: "SETTINGS",
    topic: "Trivia Topic",
    topicPlaceholder: "e.g., History, Science",
    lives: "LIVES:",
    score: "SCORE:",
    level: "LEVEL:",
    gameOver: "GAME OVER",
    restart: "TRY AGAIN",
    gateLocked: "GATE LOCKED!",
    correct: "CORRECT!",
    wrong: "WRONG!",
    language: "Language",
    controls: "WASD / ARROWS",
    loading: "GENERATING...",
    loadingQuestion: "THINKING..."
  },
  [Language.ES_MX]: {
    start: "INICIAR",
    config: "AJUSTES",
    topic: "Tema",
    topicPlaceholder: "ej., Historia, Ciencia",
    lives: "VIDAS:",
    score: "PUNTOS:",
    level: "NIVEL:",
    gameOver: "FIN DEL JUEGO",
    restart: "REINTENTAR",
    gateLocked: "¡CERRADO!",
    correct: "¡CORRECTO!",
    wrong: "¡INCORRECTO!",
    language: "Idioma",
    controls: "WASD / FLECHAS",
    loading: "GENERANDO...",
    loadingQuestion: "PENSANDO..."
  },
  [Language.PT_PT]: {
    start: "INICIAR",
    config: "OPÇÕES",
    topic: "Tópico",
    topicPlaceholder: "ex., História, Ciência",
    lives: "VIDAS:",
    score: "PONTOS:",
    level: "NÍVEL:",
    gameOver: "FIM DE JOGO",
    restart: "REINICIAR",
    gateLocked: "TRANCADO!",
    correct: "CERTO!",
    wrong: "ERRADO!",
    language: "Idioma",
    controls: "WASD / SETAS",
    loading: "A GERAR...",
    loadingQuestion: "A PENSAR..."
  }
};