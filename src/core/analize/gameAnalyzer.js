class GameAnalyzer {
  constructor() {}

  static getInstance() {
    if (!GameAnalyzer.instance) {
      GameAnalyzer.instance = new GameAnalyzer();
    }
    return GameAnalyzer.instance;
  }
}

module.exports = GameAnalyzer;
