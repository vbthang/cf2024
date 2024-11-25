const { MAP } = require('../../config/constants');

class StrategyManager {
  constructor() {
    // Init target
    this.target = MAP.GOD_BAGDE;
  }

  setTarget(target) {
    this.target = target;
  }

  findPath(map, currentPos) {}

  static getInstance() {
    if (!StrategyManager.instance) {
      StrategyManager.instance = new StrategyManager();
    }
    return StrategyManager.instance;
  }
}

module.exports = StrategyManager;
