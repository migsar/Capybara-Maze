import { Application, Container, Graphics, Text, TextStyle, Assets } from 'pixi.js';
import { BOARD_WIDTH, BOARD_HEIGHT, CELL_SIZE, ASSETS } from '../constants';
import { EntityType, Position, Direction, GameSettings, Predator } from '../types';
import { generateMaze } from '../services/levelGenerator';

type GameEventCallback = (event: string, data?: any) => void;

export class GameEngine {
  public app: Application;
  private gameContainer: Container;
  private grid: number[][] = [];
  
  // Entities
  private player: Text | null = null;
  private playerPos: Position = { x: 1, y: 1 };
  private predators: { sprite: Text, data: Predator }[] = [];
  private gates: Map<string, Text> = new Map();
  private treats: Map<string, Text> = new Map();
  
  // State
  private currentDirection: Direction | null = null;
  private nextDirection: Direction | null = null;
  private moveTimer: number = 0;
  private readonly MOVE_INTERVAL = 10; // Frames to move (smoothness)
  private isMoving: boolean = false;
  private targetPos: Position | null = null;
  
  private predatorTimer: number = 0;
  private readonly PREDATOR_INTERVAL = 40; // Slower than player
  
  private eventCallback: GameEventCallback;
  private isPaused: boolean = false;

  constructor(element: HTMLElement, callback: GameEventCallback) {
    this.app = new Application();
    this.eventCallback = callback;
    this.gameContainer = new Container();
  }

  async init() {
    await this.app.init({
      width: BOARD_WIDTH * CELL_SIZE,
      height: BOARD_HEIGHT * CELL_SIZE,
      background: '#1c1917', // stone-900
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    
    // @ts-ignore
    document.getElementById('game-canvas-container')?.appendChild(this.app.canvas);
    this.app.stage.addChild(this.gameContainer);

    // Keyboard Listeners
    window.addEventListener('keydown', this.handleKeyDown);

    // Game Loop
    this.app.ticker.add(this.update.bind(this));
  }

  public loadLevel(levelIndex: number) {
    this.gameContainer.removeChildren();
    this.gates.clear();
    this.treats.clear();
    this.predators = [];
    this.currentDirection = null;
    this.nextDirection = null;
    this.isMoving = false;
    this.targetPos = null;

    const data = generateMaze(levelIndex);
    this.grid = data.grid;
    this.playerPos = { ...data.playerStart };

    // Draw Static Layer (Walls, Floor)
    const graphics = new Graphics();
    
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const type = this.grid[y][x];
        const px = x * CELL_SIZE;
        const py = y * CELL_SIZE;

        // Floor
        graphics.rect(px, py, CELL_SIZE, CELL_SIZE);
        graphics.fill(type === EntityType.WALL ? 0x14532d : 0x292524); // green-900 or stone-800

        // Wall Detail
        if (type === EntityType.WALL) {
           graphics.rect(px + 4, py + 4, CELL_SIZE - 8, CELL_SIZE - 8);
           graphics.fill(0x166534); // green-800
        } else if (type === EntityType.POND) {
           graphics.rect(px, py, CELL_SIZE, CELL_SIZE);
           graphics.fill(0x1e3a8a); // blue-900
        }
      }
    }
    this.gameContainer.addChild(graphics);

    // Instantiate Dynamic Objects
    // Using Text for Emojis as "Sprites" for simplicity/retro feel
    const style = new TextStyle({ fontSize: 24, fontFamily: 'Arial' });

    // Pond
    const pond = new Text({ text: ASSETS.POND, style });
    pond.x = data.pond.x * CELL_SIZE + 2;
    pond.y = data.pond.y * CELL_SIZE + 2;
    this.gameContainer.addChild(pond);

    // Gates
    data.gates.forEach(g => {
      const gate = new Text({ text: ASSETS.GATE, style });
      gate.x = g.x * CELL_SIZE + 2;
      gate.y = g.y * CELL_SIZE + 2;
      this.gameContainer.addChild(gate);
      this.gates.set(`${g.x},${g.y}`, gate);
    });

    // Treats
    data.treats.forEach(t => {
      const treat = new Text({ text: ASSETS.TREAT_1, style });
      treat.x = t.x * CELL_SIZE + 4;
      treat.y = t.y * CELL_SIZE + 4;
      this.gameContainer.addChild(treat);
      this.treats.set(`${t.x},${t.y}`, treat);
    });

    // Predators
    data.predators.forEach((p, i) => {
      const predSprite = new Text({ text: ASSETS.PREDATOR_LAND, style });
      predSprite.x = p.x * CELL_SIZE + 2;
      predSprite.y = p.y * CELL_SIZE + 2;
      this.gameContainer.addChild(predSprite);
      this.predators.push({
        sprite: predSprite,
        data: { id: i, position: { ...p }, direction: 'RIGHT' }
      });
    });

    // Player
    this.player = new Text({ text: ASSETS.PLAYER, style });
    this.player.x = this.playerPos.x * CELL_SIZE + 2;
    this.player.y = this.playerPos.y * CELL_SIZE + 2;
    this.gameContainer.addChild(this.player);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    switch(e.key) {
      case 'ArrowUp': case 'w': case 'W': this.nextDirection = 'UP'; break;
      case 'ArrowDown': case 's': case 'S': this.nextDirection = 'DOWN'; break;
      case 'ArrowLeft': case 'a': case 'A': this.nextDirection = 'LEFT'; break;
      case 'ArrowRight': case 'd': case 'D': this.nextDirection = 'RIGHT'; break;
    }
  };

  private update(ticker: any) {
    if (this.isPaused || !this.player) return;

    // --- Player Movement Logic ---
    if (!this.isMoving) {
      // Try to start moving if we have input
      if (this.nextDirection) {
        this.currentDirection = this.nextDirection;
        const nextPos = this.getNextPos(this.playerPos, this.currentDirection);
        
        if (this.isValidMove(nextPos)) {
          // Check Gate
          if (this.grid[nextPos.y][nextPos.x] === EntityType.GATE) {
             this.isPaused = true;
             this.currentDirection = null; // Stop pushing into gate
             this.eventCallback('GATE_HIT', nextPos);
          } else {
             this.targetPos = nextPos;
             this.isMoving = true;
             this.moveTimer = 0;
          }
        }
      }
    } else if (this.targetPos && this.currentDirection) {
      // Interpolate visuals
      this.moveTimer++;
      const progress = this.moveTimer / this.MOVE_INTERVAL;
      
      const startX = this.playerPos.x * CELL_SIZE + 2;
      const startY = this.playerPos.y * CELL_SIZE + 2;
      const endX = this.targetPos.x * CELL_SIZE + 2;
      const endY = this.targetPos.y * CELL_SIZE + 2;

      this.player.x = startX + (endX - startX) * progress;
      this.player.y = startY + (endY - startY) * progress;

      if (this.moveTimer >= this.MOVE_INTERVAL) {
        // Move Complete
        this.isMoving = false;
        this.playerPos = { ...this.targetPos };
        this.targetPos = null;
        
        // Check Interactions
        this.checkCollisions();
      }
    }

    // --- Predator Movement Logic ---
    this.predatorTimer++;
    if (this.predatorTimer > this.PREDATOR_INTERVAL) {
      this.movePredators();
      this.predatorTimer = 0;
    }

    // --- Predator Collisions (Continuous) ---
    // Simple box collision
    const px = this.player.x;
    const py = this.player.y;
    
    for (const pred of this.predators) {
      const ex = pred.sprite.x;
      const ey = pred.sprite.y;
      const dist = Math.sqrt(Math.pow(px - ex, 2) + Math.pow(py - ey, 2));
      
      if (dist < CELL_SIZE * 0.6) {
        this.eventCallback('HIT_PREDATOR');
        this.resetPlayerPosition();
      }
    }
  }

  private movePredators() {
    this.predators.forEach(p => {
      const dirs: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
      const validMoves = dirs.filter(d => {
         const np = this.getNextPos(p.data.position, d);
         if (!this.isValidGrid(np)) return false;
         const cell = this.grid[np.y][np.x];
         return cell !== EntityType.WALL && cell !== EntityType.GATE;
      });

      if (validMoves.length > 0) {
        // Simple random walk
        const dir = validMoves[Math.floor(Math.random() * validMoves.length)];
        p.data.position = this.getNextPos(p.data.position, dir);
        
        // Snap to grid for simplicity on predators
        p.sprite.x = p.data.position.x * CELL_SIZE + 2;
        p.sprite.y = p.data.position.y * CELL_SIZE + 2;
      }
    });
  }

  private checkCollisions() {
    const key = `${this.playerPos.x},${this.playerPos.y}`;
    const type = this.grid[this.playerPos.y][this.playerPos.x];

    if (type === EntityType.TREAT) {
      if (this.treats.has(key)) {
        const sprite = this.treats.get(key);
        sprite?.destroy();
        this.treats.delete(key);
        this.grid[this.playerPos.y][this.playerPos.x] = EntityType.EMPTY;
        this.eventCallback('GET_TREAT');
      }
    } else if (type === EntityType.POND) {
      this.isPaused = true;
      this.eventCallback('WIN_LEVEL');
    }
  }

  // --- Public Methods called by React ---

  public unlockGate(pos: Position) {
    const key = `${pos.x},${pos.y}`;
    if (this.gates.has(key)) {
      this.gates.get(key)?.destroy();
      this.gates.delete(key);
      this.grid[pos.y][pos.x] = EntityType.EMPTY;
    }
    this.resume();
  }

  public resume() {
    this.isPaused = false;
    // Clear inputs so player doesn't instantly walk into danger
    this.currentDirection = null;
    this.nextDirection = null;
  }

  public destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    this.app.destroy(true, { children: true, texture: true, baseTexture: true });
  }

  // --- Helpers ---

  private resetPlayerPosition() {
    this.playerPos = { x: 1, y: 1 };
    if (this.player) {
      this.player.x = this.playerPos.x * CELL_SIZE + 2;
      this.player.y = this.playerPos.y * CELL_SIZE + 2;
    }
    this.isMoving = false;
    this.targetPos = null;
    this.currentDirection = null;
    this.nextDirection = null;
  }

  private getNextPos(pos: Position, dir: Direction): Position {
    let { x, y } = pos;
    if (dir === 'UP') y--;
    if (dir === 'DOWN') y++;
    if (dir === 'LEFT') x--;
    if (dir === 'RIGHT') x++;
    return { x, y };
  }

  private isValidGrid(pos: Position): boolean {
    return pos.x >= 0 && pos.x < BOARD_WIDTH && pos.y >= 0 && pos.y < BOARD_HEIGHT && 
           this.grid && this.grid[pos.y] !== undefined;
  }

  private isValidMove(pos: Position): boolean {
    if (!this.isValidGrid(pos)) return false;
    const cell = this.grid[pos.y][pos.x];
    return cell !== EntityType.WALL;
  }
}
