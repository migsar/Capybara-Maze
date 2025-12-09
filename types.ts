export enum Language {
  EN_US = 'en-US',
  ES_MX = 'es-MX',
  PT_PT = 'pt-PT',
}

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  TRIVIA = 'TRIVIA',
  GAME_OVER = 'GAME_OVER',
  WIN_LEVEL = 'WIN_LEVEL',
}

export enum EntityType {
  EMPTY = 0,
  WALL = 1,
  PLAYER = 2,
  PREDATOR = 3,
  TREAT = 4,
  GATE = 5,
  POND = 6,
}

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Position {
  x: number;
  y: number;
}

export interface TriviaQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface Predator {
  id: number;
  position: Position;
  direction: Direction;
}

export interface LevelConfig {
  width: number;
  height: number;
  difficulty: number;
}

export interface GameSettings {
  topic: string;
  language: Language;
}