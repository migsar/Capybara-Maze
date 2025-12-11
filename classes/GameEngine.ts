import { Application, Container, Graphics, Sprite, Texture, Assets } from 'pixi.js';
import { BOARD_WIDTH, BOARD_HEIGHT, CELL_SIZE, PALETTE } from '../constants';
import { EntityType, Position, Direction, Predator } from '../types';
import { generateMaze } from '../services/levelGenerator';

type GameEventCallback = (event: string, data?: any) => void;

export class GameEngine {
  public app: Application;
  private gameContainer: Container;
  private grid: number[][] = [];
  
  // Entities
  private player: Sprite | null = null;
  private playerPos: Position = { x: 1, y: 1 };
  private predators: { sprite: Sprite, data: Predator }[] = [];
  private gates: Map<string, Sprite> = new Map();
  private treats: Map<string, Sprite> = new Map();
  private walls: Container = new Container();
  private floor: Container = new Container();
  
  // Textures
  private textures: Record<string, Texture> = {};

  // State
  private currentDirection: Direction | null = null;
  private nextDirection: Direction | null = null;
  private moveTimer: number = 0;
  private readonly MOVE_INTERVAL = 12; 
  private isMoving: boolean = false;
  private targetPos: Position | null = null;
  
  private predatorTimer: number = 0;
  private readonly PREDATOR_INTERVAL = 35;
  
  private eventCallback: GameEventCallback;
  private isPaused: boolean = false;
  
  private time: number = 0; // For animations

  constructor(element: HTMLElement, callback: GameEventCallback) {
    this.app = new Application();
    this.eventCallback = callback;
    this.gameContainer = new Container();
  }

  async init() {
    await this.app.init({
      width: BOARD_WIDTH * CELL_SIZE,
      height: BOARD_HEIGHT * CELL_SIZE,
      background: PALETTE.UI_BG,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    
    // @ts-ignore
    document.getElementById('game-canvas-container')?.appendChild(this.app.canvas);
    
    // Generate Textures Programmatically
    this.generateTextures();

    this.app.stage.addChild(this.gameContainer);
    this.gameContainer.addChild(this.floor);
    this.gameContainer.addChild(this.walls);

    window.addEventListener('keydown', this.handleKeyDown);
    this.app.ticker.add(this.update.bind(this));
  }

  private generateTextures() {
    const g = new Graphics();

    // 1. DIRT FLOOR
    g.clear();
    g.rect(0, 0, CELL_SIZE, CELL_SIZE);
    g.fill(PALETTE.DIRT_BG);
    // Add noise
    for(let i=0; i<8; i++) {
        g.rect(Math.random()*32, Math.random()*32, 2, 2);
        g.fill(PALETTE.DIRT_NOISE);
    }
    this.textures.DIRT = this.app.renderer.generateTexture(g);

    // 2. BUSH WALL
    g.clear();
    g.rect(0, 0, CELL_SIZE, CELL_SIZE);
    g.fill(PALETTE.BUSH_MAIN); // Base
    // Leaves
    g.circle(8, 8, 6); g.fill(PALETTE.BUSH_LIGHT);
    g.circle(24, 8, 5); g.fill(PALETTE.BUSH_LIGHT);
    g.circle(16, 16, 7); g.fill(PALETTE.BUSH_DARK);
    g.circle(8, 24, 5); g.fill(PALETTE.BUSH_DARK);
    g.circle(24, 24, 6); g.fill(PALETTE.BUSH_LIGHT);
    this.textures.WALL = this.app.renderer.generateTexture(g);

    // 3. WATER POND
    g.clear();
    g.rect(0, 0, CELL_SIZE, CELL_SIZE);
    g.fill(PALETTE.WATER_MAIN);
    // Ripples
    g.rect(4, 8, 10, 2); g.fill(PALETTE.WATER_LIGHT);
    g.rect(18, 20, 8, 2); g.fill(PALETTE.WATER_LIGHT);
    this.textures.WATER = this.app.renderer.generateTexture(g);

    // 4. PLAYER (CAPYBARA)
    g.clear();
    // Body
    g.roundRect(4, 10, 24, 14, 4);
    g.fill(PALETTE.CAPYBARA);
    // Head
    g.roundRect(20, 8, 10, 10, 3);
    g.fill(PALETTE.CAPYBARA);
    // Eye/Nose
    g.rect(26, 10, 2, 2); g.fill('#000000');
    g.rect(28, 14, 2, 2); g.fill('#221100');
    this.textures.PLAYER = this.app.renderer.generateTexture(g);

    // 5. PREDATOR (JAGUAR)
    g.clear();
    g.roundRect(2, 12, 28, 12, 4);
    g.fill(PALETTE.JAGUAR);
    // Spots
    g.circle(8, 16, 2); g.fill('#000000');
    g.circle(16, 18, 2); g.fill('#000000');
    g.circle(24, 15, 2); g.fill('#000000');
    this.textures.PREDATOR = this.app.renderer.generateTexture(g);

    // 6. TREAT
    g.clear();
    g.circle(16, 16, 8);
    g.fill(PALETTE.TREAT);
    g.rect(15, 6, 2, 4); g.fill('#166534'); // Stem
    this.textures.TREAT = this.app.renderer.generateTexture(g);

    // 7. GATE
    g.clear();
    // Logs
    g.rect(4, 4, 4, 24); g.fill(PALETTE.GATE);
    g.rect(14, 4, 4, 24); g.fill(PALETTE.GATE);
    g.rect(24, 4, 4, 24); g.fill(PALETTE.GATE);
    // Crossbeam
    g.rect(2, 8, 28, 4); g.fill(PALETTE.GATE);
    g.rect(2, 20, 28, 4); g.fill(PALETTE.GATE);
    this.textures.GATE = this.app.renderer.generateTexture(g);
  }

  public loadLevel(levelIndex: number) {
    // Cleanup
    this.walls.removeChildren();
    this.floor.removeChildren();
    this.gates.forEach(s => s.destroy());
    this.gates.clear();
    this.treats.forEach(s => s.destroy());
    this.treats.clear();
    this.predators.forEach(p => p.sprite.destroy());
    this.predators = [];
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }

    // Reset State
    this.currentDirection = null;
    this.nextDirection = null;
    this.isMoving = false;
    this.targetPos = null;

    // Generate Level
    const data = generateMaze(levelIndex);
    this.grid = data.grid;
    this.playerPos = { ...data.playerStart };

    // Draw Grid
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const type = this.grid[y][x];
        const px = x * CELL_SIZE;
        const py = y * CELL_SIZE;

        // Draw Floor everywhere
        const floorSprite = new Sprite(this.textures.DIRT);
        floorSprite.position.set(px, py);
        this.floor.addChild(floorSprite);

        // Draw Walls or Pond on top
        if (type === EntityType.WALL) {
           const wall = new Sprite(this.textures.WALL);
           wall.position.set(px, py);
           this.walls.addChild(wall);
        } else if (type === EntityType.POND) {
           const water = new Sprite(this.textures.WATER);
           water.position.set(px, py);
           // Overwrite floor with water
           this.floor.addChild(water); 
        }
      }
    }

    // Instantiate Entities
    
    // Gates
    data.gates.forEach(g => {
      const s = new Sprite(this.textures.GATE);
      s.position.set(g.x * CELL_SIZE, g.y * CELL_SIZE);
      this.gameContainer.addChild(s);
      this.gates.set(`${g.x},${g.y}`, s);
    });

    // Treats
    data.treats.forEach(t => {
      const s = new Sprite(this.textures.TREAT);
      s.position.set(t.x * CELL_SIZE, t.y * CELL_SIZE);
      this.gameContainer.addChild(s);
      this.treats.set(`${t.x},${t.y}`, s);
    });

    // Predators
    data.predators.forEach((p, i) => {
      const s = new Sprite(this.textures.PREDATOR);
      s.position.set(p.x * CELL_SIZE, p.y * CELL_SIZE);
      this.gameContainer.addChild(s);
      this.predators.push({
        sprite: s,
        data: { id: i, position: { ...p }, direction: 'RIGHT' }
      });
    });

    // Player
    this.player = new Sprite(this.textures.PLAYER);
    this.player.position.set(this.playerPos.x * CELL_SIZE, this.playerPos.y * CELL_SIZE);
    this.gameContainer.addChild(this.player);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (['ArrowUp', 'w', 'W'].includes(e.key)) this.nextDirection = 'UP';
    if (['ArrowDown', 's', 'S'].includes(e.key)) this.nextDirection = 'DOWN';
    if (['ArrowLeft', 'a', 'A'].includes(e.key)) this.nextDirection = 'LEFT';
    if (['ArrowRight', 'd', 'D'].includes(e.key)) this.nextDirection = 'RIGHT';
  };

  private update(ticker: any) {
    if (this.isPaused || !this.player) return;

    this.time += 0.1;
    
    // Bobbing Animation for entities
    const bob = Math.sin(this.time) * 2;
    this.player.y = (this.isMoving && this.targetPos ? this.player.y : this.playerPos.y * CELL_SIZE) + bob;
    
    this.predators.forEach(p => {
        p.sprite.y = p.data.position.y * CELL_SIZE + Math.cos(this.time + p.data.id) * 2;
    });

    // --- Player Movement Logic ---
    if (!this.isMoving) {
      if (this.nextDirection) {
        this.currentDirection = this.nextDirection;
        
        // Flip sprite based on direction
        if (this.currentDirection === 'LEFT') this.player.scale.x = -1;
        if (this.currentDirection === 'RIGHT') this.player.scale.x = 1;
        // Adjust pivot for flip (since sprite anchor is 0,0 by default, flip makes it jump)
        if (this.player.scale.x === -1) this.player.anchor.set(1, 0);
        else this.player.anchor.set(0, 0);

        const nextPos = this.getNextPos(this.playerPos, this.currentDirection);
        
        if (this.isValidMove(nextPos)) {
          // Check Gate
          if (this.grid[nextPos.y][nextPos.x] === EntityType.GATE) {
             this.isPaused = true;
             this.currentDirection = null; 
             this.eventCallback('GATE_HIT', nextPos);
          } else {
             this.targetPos = nextPos;
             this.isMoving = true;
             this.moveTimer = 0;
          }
        }
      }
    } else if (this.targetPos && this.currentDirection) {
      this.moveTimer++;
      const progress = this.moveTimer / this.MOVE_INTERVAL;
      
      const startX = this.playerPos.x * CELL_SIZE;
      const startY = this.playerPos.y * CELL_SIZE;
      const endX = this.targetPos.x * CELL_SIZE;
      const endY = this.targetPos.y * CELL_SIZE;

      // Simple Lerp
      let currentX = startX + (endX - startX) * progress;
      let currentY = startY + (endY - startY) * progress;
      
      this.player.x = currentX;
      // Y is handled by bobbing above, but we need base Y
      this.player.y = currentY + bob;

      if (this.moveTimer >= this.MOVE_INTERVAL) {
        this.isMoving = false;
        this.playerPos = { ...this.targetPos };
        this.targetPos = null;
        this.checkCollisions();
      }
    }

    // --- Predator Logic ---
    this.predatorTimer++;
    if (this.predatorTimer > this.PREDATOR_INTERVAL) {
      this.movePredators();
      this.predatorTimer = 0;
    }

    // --- Collisions ---
    const px = this.player.x + 16; // Center approx
    const py = this.player.y + 16;
    
    for (const pred of this.predators) {
      const ex = pred.sprite.x + 16;
      const ey = pred.sprite.y + 16;
      const dist = Math.sqrt(Math.pow(px - ex, 2) + Math.pow(py - ey, 2));
      
      if (dist < CELL_SIZE * 0.7) {
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
         // Guard for grid bounds
         if (!this.grid || !this.grid[np.y] || this.grid[np.y][np.x] === undefined) return false;
         
         const cell = this.grid[np.y][np.x];
         return cell !== EntityType.WALL && cell !== EntityType.GATE;
      });

      if (validMoves.length > 0) {
        const dir = validMoves[Math.floor(Math.random() * validMoves.length)];
        p.data.position = this.getNextPos(p.data.position, dir);
        
        // Face direction
        if (dir === 'RIGHT') p.sprite.scale.x = 1;
        if (dir === 'LEFT') { p.sprite.scale.x = -1; p.sprite.anchor.set(1, 0); }
        else p.sprite.anchor.set(0, 0);

        p.sprite.x = p.data.position.x * CELL_SIZE;
        p.sprite.y = p.data.position.y * CELL_SIZE;
      }
    });
  }

  private checkCollisions() {
    const key = `${this.playerPos.x},${this.playerPos.y}`;
    const type = this.grid[this.playerPos.y][this.playerPos.x];

    if (type === EntityType.TREAT) {
      if (this.treats.has(key)) {
        this.treats.get(key)?.destroy();
        this.treats.delete(key);
        this.grid[this.playerPos.y][this.playerPos.x] = EntityType.EMPTY;
        this.eventCallback('GET_TREAT');
      }
    } else if (type === EntityType.POND) {
      this.isPaused = true;
      this.eventCallback('WIN_LEVEL');
    }
  }

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
    this.currentDirection = null;
    this.nextDirection = null;
  }

  public destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    this.app.destroy(true, { children: true, texture: true, baseTexture: true });
  }

  private resetPlayerPosition() {
    this.playerPos = { x: 1, y: 1 };
    if (this.player) {
      this.player.position.set(this.playerPos.x * CELL_SIZE, this.playerPos.y * CELL_SIZE);
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

  private isValidMove(pos: Position): boolean {
    if (!this.grid || !this.grid[pos.y] || this.grid[pos.y][pos.x] === undefined) return false;
    const cell = this.grid[pos.y][pos.x];
    return cell !== EntityType.WALL;
  }
}