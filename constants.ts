import { Language } from './types';

export const CELL_SIZE = 32; // In pixels, effectively
export const BOARD_WIDTH = 21; // Must be odd for maze generation
export const BOARD_HEIGHT = 15; // Must be odd

// Visual Assets (Using Emojis for simplicity and retro feel)
export const ASSETS = {
  PLAYER: '🦦',
  PREDATOR_LAND: '🐆',
  PREDATOR_WATER: '🐊',
  TREAT_1: '🍉',
  TREAT_2: '🍊',
  GATE: '🪵',
  POND: '💧',
  WALL: '🌳',
  EMPTY: '🟫', // Dirt path
};

export const TRANSLATIONS = {
  [Language.EN_US]: {
    start: "START GAME",
    config: "SETTINGS",
    topic: "Trivia Topic",
    topicPlaceholder: "e.g., History, Science, Pop Culture",
    lives: "LIVES",
    score: "SCORE",
    level: "LEVEL",
    gameOver: "GAME OVER",
    restart: "TRY AGAIN",
    gateLocked: "GATE LOCKED!",
    correct: "CORRECT!",
    wrong: "WRONG!",
    language: "Language",
    controls: "Use W,A,S,D or Arrow Keys to move.",
    loading: "Generating Maze...",
    loadingQuestion: "Thinking..."
  },
  [Language.ES_MX]: {
    start: "INICIAR JUEGO",
    config: "AJUSTES",
    topic: "Tema de Trivia",
    topicPlaceholder: "ej., Historia, Ciencia, Cultura Pop",
    lives: "VIDAS",
    score: "PUNTOS",
    level: "NIVEL",
    gameOver: "FIN DEL JUEGO",
    restart: "INTENTAR DE NUEVO",
    gateLocked: "¡PUERTA CERRADA!",
    correct: "¡CORRECTO!",
    wrong: "¡INCORRECTO!",
    language: "Idioma",
    controls: "Usa W,A,S,D o Flechas para moverte.",
    loading: "Generando Laberinto...",
    loadingQuestion: "Pensando..."
  },
  [Language.PT_PT]: {
    start: "INICIAR JOGO",
    config: "DEFINIÇÕES",
    topic: "Tópico de Trivia",
    topicPlaceholder: "ex., História, Ciência, Cultura Pop",
    lives: "VIDAS",
    score: "PONTOS",
    level: "NÍVEL",
    gameOver: "FIM DE JOGO",
    restart: "TENTAR NOVAMENTE",
    gateLocked: "PORTÃO TRANCADO!",
    correct: "CORRETO!",
    wrong: "ERRADO!",
    language: "Idioma",
    controls: "Use W,A,S,D ou Setas para mover.",
    loading: "A gerar labirinto...",
    loadingQuestion: "A pensar..."
  }
};