const { MAP, DRIVE } = require('../../config/constants');

class Node {
  constructor(position, parent = null) {
    this.position = position;
    this.parent = parent;
    this.g = 0; // Cost from start to current node
    this.h = 0; // Heuristic (estimated cost from current to end)
    this.f = 0; // Total cost (g + h)
    this.breakWallDirection = null; //
  }
}

class AStar {
  constructor(map) {
    this.map = map;
    this.DIRECTIONS = {
      [DRIVE.MOVE_LEFT]: [-1, 0],
      [DRIVE.MOVE_RIGHT]: [1, 0],
      [DRIVE.MOVE_UP]: [0, -1],
      [DRIVE.MOVE_DOWN]: [0, 1],
    };
  }

  // Find all targets (GOD_BAGDE) on the map
  findTargets() {
    const targets = [];
    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map[y].length; x++) {
        if (this.map[y][x] === MAP.GOD_BAGDE) {
          targets.push([x, y]);
        }
      }
    }
    return targets;
  }

  // Calc manhattan distance between 2 positions because can only move in 4 directions
  manhattanDistance(pos1, pos2) {
    return Math.abs(pos1[0] - pos2[0]) + Math.abs(pos1[1] - pos2[1]);
  }

  isValid(pos) {
    const [x, y] = pos;
    return y >= 0 && y < this.map.length && x >= 0 && x < this.map[y].length;
  }

  canMove(pos) {
    const [x, y] = pos;
    const cell = this.map[y][x];
    return cell === MAP.EMPTY_CELL || cell === MAP.GOD_BAGDE;
  }

  // Check if there is a breakable wall at the given position
  checkBreakableWalls(pos) {
    const [x, y] = pos;
    const breakableDirections = [];

    // Ex: Object.entries => [[DRIVE.MOVE_LEFT, [-1, 0]], ...]
    for (const [dir, [dx, dy]] of Object.entries(this.DIRECTIONS)) {
      const newX = x + dx;
      const newY = y + dy;

      if (
        this.isValid([newX, newY]) &&
        this.map[newY][newX] === MAP.BRICK_WALL
      ) {
        breakableDirections.push([dir, [newX, newY]]);
      }
    }

    return breakableDirections;
  }

  getPath(node) {
    const moves = [];
    let current = node;

    while (current.parent) {
      const [cx, cy] = current.position;
      const [px, py] = current.parent.position;

      let moveCommand = '';
      if (cx < px) moveCommand = DRIVE.MOVE_LEFT;
      else if (cx > px) moveCommand = DRIVE.MOVE_RIGHT;
      else if (cy < py) moveCommand = DRIVE.MOVE_UP;
      else if (cy > py) moveCommand = DRIVE.MOVE_DOWN;

      if (current.breakWallDirection) {
        moves.unshift(current.breakWallDirection + DRIVE.USE_WEAPON);
      } else {
        moves.unshift(moveCommand);
      }

      current = current.parent;
    }

    return moves.join('');
  }

  findPath(start) {
    const targets = this.findTargets();
    if (targets.length === 0) return null;

    let bestPath = null;
    let shortestLength = Infinity;

    for (const target of targets) {
      const openList = [];
      const closedSet = new Set();

      const startNode = new Node(start);
      startNode.h = this.manhattanDistance(start, target);
      startNode.f = startNode.h;

      openList.push(startNode);

      while (openList.length > 0) {
        openList.sort((a, b) => a.f - b.f);
        const currentNode = openList.shift();
        const [cx, cy] = currentNode.position;

        if (cx === target[0] && cy === target[1]) {
          const path = this.getPath(currentNode);
          if (path.length < shortestLength) {
            shortestLength = path.length;
            bestPath = path;
          }
          break;
        }

        closedSet.add(`${cx},${cy}`);

        const breakableWalls = this.checkBreakableWalls([cx, cy]);
        for (const [breakDir, [wallX, wallY]] of breakableWalls) {
          const dx = wallX - cx;
          const dy = wallY - cy;
          const beyondWallX = wallX + dx;
          const beyondWallY = wallY + dy;

          if (!this.isValid([beyondWallX, beyondWallY])) continue;
          if (!this.canMove([beyondWallX, beyondWallY])) continue;

          const posAfterBreak = [beyondWallX, beyondWallY];
          if (closedSet.has(`${beyondWallX},${beyondWallY}`)) continue;

          const newNode = new Node(posAfterBreak, currentNode);
          newNode.g = currentNode.g + 3;
          newNode.h = this.manhattanDistance(posAfterBreak, target);
          newNode.f = newNode.g + newNode.h;
          newNode.breakWallDirection = breakDir;

          const existingNode = openList.find(
            (node) =>
              node.position[0] === beyondWallX &&
              node.position[1] === beyondWallY,
          );

          if (existingNode && existingNode.f <= newNode.f) continue;

          if (!existingNode) {
            openList.push(newNode);
          } else {
            Object.assign(existingNode, newNode);
          }
        }

        for (const [dir, [dx, dy]] of Object.entries(this.DIRECTIONS)) {
          const newPos = [cx + dx, cy + dy];

          if (!this.isValid(newPos) || !this.canMove(newPos)) continue;
          if (closedSet.has(`${newPos[0]},${newPos[1]}`)) continue;

          const newNode = new Node(newPos, currentNode);
          newNode.g = currentNode.g + 1;
          newNode.h = this.manhattanDistance(newPos, target);
          newNode.f = newNode.g + newNode.h;

          const existingNode = openList.find(
            (node) =>
              node.position[0] === newPos[0] && node.position[1] === newPos[1],
          );

          if (existingNode && existingNode.f <= newNode.f) continue;

          if (!existingNode) {
            openList.push(newNode);
          } else {
            Object.assign(existingNode, newNode);
          }
        }
      }
    }

    return bestPath;
  }
}

module.exports = AStar;
