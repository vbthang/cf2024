const DIRECTIONS = {
  [DRIVE.MOVE_LEFT]: [-1, 0],
  [DRIVE.MOVE_RIGHT]: [1, 0],
  [DRIVE.MOVE_UP]: [0, -1],
  [DRIVE.MOVE_DOWN]: [0, 1],
};

function findSafePosition(currentPos, map, bombs) {
  const [currentX, currentY] = currentPos;
  const rows = map.length;
  const cols = map[0].length;

  // const directions = [
  //   [0, 0], // Vị trí hiện tại
  //   [0, 1], // Phải
  //   [0, -1], // Trái
  //   [1, 0], // Xuống
  //   [-1, 0], // Lên
  // ];

  const isValidPosition = (x, y) => {
    return x >= 0 && x < rows && y >= 0 && y < cols;
  };

  const isSafePosition = (x, y) => {
    for (const [bombX, bombY, radius] of bombs) {
      console.log(
        `Checking position (${x},${y}) against bomb at (${bombX},${bombY}) with radius ${radius}`,
      );

      // DEBUG: Kiểm tra điều kiện chi tiết
      const isInXLine = x === bombX && Math.abs(y - bombY) <= radius;
      const isInYLine = y === bombY && Math.abs(x - bombX) <= radius;

      console.log(`In X Line: ${isInXLine}, In Y Line: ${isInYLine}`);

      if (isInXLine || isInYLine) {
        console.log(`Unsafe position due to bomb at (${bombX},${bombY})`);
        return false;
      }
    }
    return true;
  };

  const manhattanDistance = (x1, y1, x2, y2) => {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  };

  const safePositions = [];

  for (const [dx, dy] of directions) {
    const newX = currentX + dx;
    const newY = currentY + dy;

    console.log(`Checking potential position: (${newX}, ${newY})`);

    if (isValidPosition(newX, newY) && isSafePosition(newX, newY)) {
      safePositions.push({
        position: [newX, newY],
        distance: manhattanDistance(currentX, currentY, newX, newY),
      });
    }
  }

  console.log(`Safe positions found: ${safePositions.length}`);

  return safePositions.length > 0 ? safePositions[0].position : null;
}

const map = [
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
];

const bombs = [
  [0, 0, 1],
  [2, 1, 1],
];

const currentPos = [0, 0];
const safePos = findSafePosition(currentPos, map, bombs);
console.log('Vị trí an toàn:', safePos);
