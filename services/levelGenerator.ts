import { BOARD_WIDTH, BOARD_HEIGHT } from "../constants";
import { EntityType, Position } from "../types";

// Helper to check bounds
const isValid = (x: number, y: number) => {
  return x > 0 && x < BOARD_WIDTH - 1 && y > 0 && y < BOARD_HEIGHT - 1;
};

export const generateMaze = (levelIndex: number): { 
  grid: number[][], 
  playerStart: Position, 
  predators: Position[],
  treats: Position[],
  gates: Position[],
  pond: Position
} => {
  const width = BOARD_WIDTH;
  const height = BOARD_HEIGHT;
  
  // 1. Initialize grid full of walls
  const grid: number[][] = Array.from({ length: height }, () => 
    Array.from({ length: width }, () => EntityType.WALL)
  );

  // 2. Recursive Backtracker for Maze Generation
  // Start at 1,1
  const start: Position = { x: 1, y: 1 };
  grid[start.y][start.x] = EntityType.EMPTY;
  
  const stack: Position[] = [start];
  const directions = [
    { x: 0, y: -2 }, // Up
    { x: 0, y: 2 },  // Down
    { x: -2, y: 0 }, // Left
    { x: 2, y: 0 }   // Right
  ];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors: { p: Position, d: Position }[] = [];

    // Check all 4 directions
    for (const d of directions) {
      const nx = current.x + d.x;
      const ny = current.y + d.y;

      if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1) {
        if (grid[ny][nx] === EntityType.WALL) {
          neighbors.push({ p: { x: nx, y: ny }, d: { x: d.x / 2, y: d.y / 2 } });
        }
      }
    }

    if (neighbors.length > 0) {
      // Choose random neighbor
      const chosen = neighbors[Math.floor(Math.random() * neighbors.length)];
      
      // Remove wall between
      grid[current.y + chosen.d.y][current.x + chosen.d.x] = EntityType.EMPTY;
      grid[chosen.p.y][chosen.p.x] = EntityType.EMPTY;
      
      stack.push(chosen.p);
    } else {
      stack.pop();
    }
  }

  // 3. Post-processing: Make it "loopier" (less dead ends) by removing some random walls
  const loopsToRemove = Math.floor((width * height) * 0.05); // 5% of tiles
  for (let i = 0; i < loopsToRemove; i++) {
    const rx = Math.floor(Math.random() * (width - 2)) + 1;
    const ry = Math.floor(Math.random() * (height - 2)) + 1;
    if (grid[ry][rx] === EntityType.WALL) {
       // Only remove if it connects two empty spaces
       // (Simple heuristic: just remove random inner walls)
       grid[ry][rx] = EntityType.EMPTY;
    }
  }

  // 4. Place Entities
  
  // Pond (Goal) - Try to place it far from start (bottom right area)
  let pond: Position = { x: width - 2, y: height - 2 };
  // Ensure pond is on an empty spot (it should be due to maze alg, but safe check)
  while(grid[pond.y][pond.x] === EntityType.WALL) {
    pond.x--;
    if(pond.x <= 1) { pond.x = width-2; pond.y--; }
  }
  grid[pond.y][pond.x] = EntityType.POND;

  // Collect empty spots for placement
  const emptySpots: Position[] = [];
  for(let y=1; y<height-1; y++) {
    for(let x=1; x<width-1; x++) {
      if(grid[y][x] === EntityType.EMPTY && (x !== start.x || y !== start.y) && (x !== pond.x || y !== pond.y)) {
        emptySpots.push({x, y});
      }
    }
  }

  // Shuffle empty spots
  for (let i = emptySpots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [emptySpots[i], emptySpots[j]] = [emptySpots[j], emptySpots[i]];
  }

  // Gates - block paths
  // We need to place gates on "chokepoints" ideally, but random placement on paths works for now.
  const gates: Position[] = [];
  const numGates = 2 + Math.floor(levelIndex / 2); // More gates as levels go up
  for(let i=0; i<numGates && emptySpots.length > 0; i++) {
     const pos = emptySpots.pop()!;
     grid[pos.y][pos.x] = EntityType.GATE;
     gates.push(pos);
  }

  // Predators
  const predators: Position[] = [];
  const numPredators = 2 + Math.floor(levelIndex / 3);
  for(let i=0; i<numPredators && emptySpots.length > 0; i++) {
    const pos = emptySpots.pop()!;
    predators.push(pos);
    // Note: We don't mark grid as predator, because they move. Grid stays EMPTY.
  }

  // Treats
  const treats: Position[] = [];
  const numTreats = 3;
  for(let i=0; i<numTreats && emptySpots.length > 0; i++) {
    const pos = emptySpots.pop()!;
    grid[pos.y][pos.x] = EntityType.TREAT;
    treats.push(pos);
  }

  return {
    grid,
    playerStart: start,
    predators,
    treats,
    gates,
    pond
  };
};