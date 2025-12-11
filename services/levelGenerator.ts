import { BOARD_WIDTH, BOARD_HEIGHT } from "../constants";
import { EntityType, Position } from "../types";

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
      const chosen = neighbors[Math.floor(Math.random() * neighbors.length)];
      grid[current.y + chosen.d.y][current.x + chosen.d.x] = EntityType.EMPTY;
      grid[chosen.p.y][chosen.p.x] = EntityType.EMPTY;
      stack.push(chosen.p);
    } else {
      stack.pop();
    }
  }

  // 3. Post-processing: Remove some walls for loops
  const loopsToRemove = Math.floor((width * height) * 0.08); 
  for (let i = 0; i < loopsToRemove; i++) {
    const rx = Math.floor(Math.random() * (width - 2)) + 1;
    const ry = Math.floor(Math.random() * (height - 2)) + 1;
    if (grid[ry][rx] === EntityType.WALL) {
       grid[ry][rx] = EntityType.EMPTY;
    }
  }

  // 4. Create Pond Area (4x4 block in bottom right)
  const pondWidth = 4;
  const pondHeight = 4;
  const pondStartX = width - pondWidth - 1;
  const pondStartY = height - pondHeight - 1;

  // Carve out the pond
  for (let y = pondStartY; y < pondStartY + pondHeight; y++) {
    for (let x = pondStartX; x < pondStartX + pondWidth; x++) {
      grid[y][x] = EntityType.POND;
    }
  }

  // Ensure connectivity to the pond
  // We carve a path from a known empty spot outside the pond into the pond
  const connectX = pondStartX - 1;
  const connectY = pondStartY + Math.floor(pondHeight / 2);
  grid[connectY][connectX] = EntityType.EMPTY;
  // Make sure the spot next to it is also empty so we don't have a wall blocking the entrance
  if (grid[connectY][connectX - 1] === EntityType.WALL) {
      grid[connectY][connectX - 1] = EntityType.EMPTY;
  }

  // Define the "Goal" position as the center of the pond
  const pond: Position = { 
    x: pondStartX + Math.floor(pondWidth/2), 
    y: pondStartY + Math.floor(pondHeight/2) 
  };

  // 5. Place Entities (excluding pond area)
  const emptySpots: Position[] = [];
  for(let y=1; y<height-1; y++) {
    for(let x=1; x<width-1; x++) {
      // Check if inside pond area
      const inPond = x >= pondStartX && x < pondStartX + pondWidth && 
                     y >= pondStartY && y < pondStartY + pondHeight;
      
      if(grid[y][x] === EntityType.EMPTY && !inPond && (x !== start.x || y !== start.y)) {
        emptySpots.push({x, y});
      }
    }
  }

  // Shuffle spots
  for (let i = emptySpots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [emptySpots[i], emptySpots[j]] = [emptySpots[j], emptySpots[i]];
  }

  // Gates
  const gates: Position[] = [];
  const numGates = 2 + Math.floor(levelIndex / 2);
  for(let i=0; i<numGates && emptySpots.length > 0; i++) {
     const pos = emptySpots.pop()!;
     grid[pos.y][pos.x] = EntityType.GATE;
     gates.push(pos);
  }

  // Predators
  const predators: Position[] = [];
  const numPredators = 3 + Math.floor(levelIndex / 3);
  for(let i=0; i<numPredators && emptySpots.length > 0; i++) {
    const pos = emptySpots.pop()!;
    predators.push(pos);
  }

  // Treats
  const treats: Position[] = [];
  const numTreats = 4;
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