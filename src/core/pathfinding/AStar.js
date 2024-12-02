const { MAP, DRIVE } = require('../../config/constants');

class Node {
  constructor(position, parent = null) {
    this.position = position;
    this.parent = parent;
    this.g = 0; // Chi phí thực từ điểm bắt đầu đến node hiện tại
    this.h = 0; // Chi phí ước tính từ node hiện tại đến đích
    this.f = 0; // Tổng chi phí (g + h)
    this.breakWallDirection = null;
    this.path = ''; // Lưu đường đi
  }
}

const DIRECTIONS = {
  [DRIVE.MOVE_LEFT]: [-1, 0],
  [DRIVE.MOVE_RIGHT]: [1, 0],
  [DRIVE.MOVE_UP]: [0, -1],
  [DRIVE.MOVE_DOWN]: [0, 1],
};

const COSTS = {
  move: 1,
  breakWall: 4,
};

function findTargets(map, target) {
  const targets = [];
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      if (map[y][x] == target) {
        targets.push([x, y]);
      }
    }
  }
  return targets;
}

function findPositionSetBomb(map, target, start, radius = 1) {
  const { x: startX, y: startY } = start;

  console.log('Target:', target);

  let bestPosition = null;
  let maxTargets = 0;
  let minDistance = Infinity;

  // Fix: Magic number 20 ???
  while (radius <= 20) {
    console.log(radius);
    for (let y = startY - radius; y <= startY + radius; y++) {
      for (let x = startX - radius; x <= startX + radius; x++) {
        if (
          !isValidPosition(map, [x, y]) ||
          map[y][x] === target ||
          map[y][x] === MAP.BRICK_WALL ||
          map[y][x] === MAP.STONE_WALL
        ) {
          continue;
        }

        let affectedTargets = 0;
        for (const [dir, [dx, dy]] of Object.entries(DIRECTIONS)) {
          const nx = x + dx;
          const ny = y + dy;
          if (isValidPosition(map, [nx, ny]) && map[ny][nx] === target) {
            affectedTargets++;
          }
        }

        const distance = Math.abs(startX - x) + Math.abs(startY - y);
        if (affectedTargets > 0) {
          if (
            affectedTargets > maxTargets ||
            (affectedTargets === maxTargets && distance < minDistance)
          ) {
            maxTargets = affectedTargets;
            minDistance = distance;
            bestPosition = [x, y];
          }
        }
      }
    }

    if (bestPosition) {
      return [bestPosition];
    }

    radius++;
  }

  return [];
}

function findNearSafePosition(map, bombs, current) {
  const { x: startX, y: startY } = current;

  const checkBomb = (x, y) => {
    for (let bomb of bombs) {
      console.log('Vị trí kiểm tra:', [x, y]);
      console.log('Vị trí bomb:', bomb);
      let { row, col, power } = bomb;
      if (x === row && y === col) return true;
      if (x === row) {
        if (y >= col - power || y <= col + power) {
          console.log('Return True');
          return true;
        }
      }
      if (y === col) {
        if (x >= row - power || x <= row + power) {
          console.log('Return True');
          return true;
        }
      }
    }
    console.log('Return False');
    return false;
  };

  let radius = 1;
  while (radius <= 10) {
    console.log('------***------');
    console.log('Tìm kiếm', radius, 'ô quanh tôi');
    for (let y = startY - radius; y <= startY + radius; y++) {
      for (let x = startX - radius; x <= startX + radius; x++) {
        if (
          map[y][x] === MAP.BALK ||
          map[y][x] === MAP.BRICK_WALL ||
          map[y][x] === MAP.STONE_WALL ||
          map[y][x] === MAP.BOMB ||
          checkBomb(x, y) ||
          !isValidPosition(map, [x, y])
        ) {
          console.log('Không thể đứng ở:', [x, y]);
          continue;
        }
        console.log('Vị trí an toàn để tránh bomb:', [x, y]);
        return [[x, y]];
      }
    }
    radius++;
  }

  return [[startX, startY]];
}

function manhattanDistance(pos1, pos2) {
  return Math.abs(pos1[0] - pos2[0]) + Math.abs(pos1[1] - pos2[1]);
}

function isValidPosition(map, [x, y]) {
  return y >= 1 && y < map.length - 1 && x >= 1 && x < map[0].length - 1;
}

function canMove(map, [x, y]) {
  return (
    map[y][x] === MAP.EMPTY_CELL ||
    map[y][x] === MAP.GOD_BAGDE ||
    map[y][x] === MAP.BRICK_WALL ||
    map[y][x] === MAP.SPEC_CELL
  );
}

function findBreakableWalls(map, [x, y]) {
  const breakableWalls = [];

  for (const [dir, [dx, dy]] of Object.entries(DIRECTIONS)) {
    const newX = x + dx;
    const newY = y + dy;

    if (
      isValidPosition(map, [newX, newY]) &&
      map[newY][newX] === MAP.BRICK_WALL
    ) {
      breakableWalls.push([dir, [newX, newY]]);
    }
  }

  return breakableWalls;
}

function constructPath(node) {
  const path = [];
  let current = node;

  while (current.parent) {
    if (current.breakWallDirection) {
      path.unshift(current.breakWallDirection + DRIVE.USE_WEAPON);
    } else {
      const [cx, cy] = current.position;
      const [px, py] = current.parent.position;

      if (cx < px) path.unshift(DRIVE.MOVE_LEFT);
      else if (cx > px) path.unshift(DRIVE.MOVE_RIGHT);
      else if (cy < py) path.unshift(DRIVE.MOVE_UP);
      else if (cy > py) path.unshift(DRIVE.MOVE_DOWN);
    }
    current = current.parent;
  }

  return path.join('');
}

function findPathToTarget(map, start, target) {
  const openList = [];
  const closedSet = new Set();

  const startNode = new Node(start);
  startNode.h = manhattanDistance(start, target);
  startNode.f = startNode.h;

  openList.push(startNode);

  while (openList.length > 0) {
    openList.sort((a, b) => a.f - b.f);
    const currentNode = openList.shift();
    const [cx, cy] = currentNode.position;

    if (cx == target[0] && cy == target[1]) {
      return {
        path: constructPath(currentNode),
        cost: currentNode.g,
      };
    }

    closedSet.add(`${cx},${cy}`);

    // Xử lý phá tường
    const breakableWalls = findBreakableWalls(map, [cx, cy]);

    for (const [breakDir, [wallX, wallY]] of breakableWalls) {
      if (closedSet.has(`${wallX},${wallY}`)) continue;

      const newG = currentNode.g + COSTS.breakWall;
      const newNode = new Node([wallX, wallY], currentNode);

      newNode.g = newG;
      newNode.h = manhattanDistance([wallX, wallY], target);
      newNode.f = newNode.g + newNode.h;
      newNode.breakWallDirection = breakDir;

      const existingNode = openList.find(
        (node) => node.position[0] == wallX && node.position[1] == wallY,
      );

      if (existingNode && existingNode.f <= newNode.f) continue;

      if (!existingNode) {
        openList.push(newNode);
      } else {
        Object.assign(existingNode, newNode);
      }
    }

    // Xử lý di chuyển bình thường}
    for (const [dir, [dx, dy]] of Object.entries(DIRECTIONS)) {
      const newX = cx + dx;
      const newY = cy + dy;

      if (!isValidPosition(map, [newX, newY])) continue;
      if (!canMove(map, [newX, newY])) continue;
      if (closedSet.has(`${newX},${newY}`)) continue;

      const newG = currentNode.g + COSTS.move;
      const newNode = new Node([newX, newY], currentNode);

      newNode.g = newG;
      newNode.h = manhattanDistance([newX, newY], target);
      newNode.f = newNode.g + newNode.h;

      const existingNode = openList.find(
        (node) => node.position[0] === newX && node.position[1] === newY,
      );

      if (existingNode && existingNode.f <= newNode.f) continue;

      if (!existingNode) {
        openList.push(newNode);
      } else {
        Object.assign(existingNode, newNode);
      }
    }
  }

  return null;
}

function findShortestPath(map, start, targets) {
  if (!targets || targets.length == 0) return null;

  let shortestPath = null;
  let minTotalCost = Infinity;

  // Thử tìm đường đi đến từng target
  for (const target of targets) {
    const result = findPathToTarget(map, [start.x, start.y], target);
    console.log('result', result);

    if (result && result.cost < minTotalCost) {
      minTotalCost = result.cost;
      shortestPath = result.path;
    }
  }

  return shortestPath;
}

module.exports = {
  findTargets,
  findPositionSetBomb,
  findShortestPath,
  findNearSafePosition,
};
