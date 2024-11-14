const { TAG, ITEM, MAP } = require('../config/constants');
const AStar = require('./pathfinding/AStar');

class GameClient {
  currentTag = null;

  constructor(socket, playerId) {
    this.socket = socket;
    this.playerId = playerId;
    this.brickWall = 0;
    this.isRunning = false;
  }

  onTicktack(res) {
    let { tag } = res;
    console.log('Tag', tag);
    switch (tag) {
      case TAG.GAME_START:
        this._onGameUpdate(res);
        break;
      case TAG.GAME_UPDATE:
        this._onGameUpdate(res);
        break;
      case TAG.PLAYER_START_MOVING:
        this._onPlayerStartMoving(res);
        break;
    }
  }

  onDrivePlayer(res) {}

  _onGameStart(res) {
    let { id } = res;
  }

  _onGameUpdate(res) {
    let { id, map_info } = res;
    let { size, players, map } = map_info;
    this.currentTag = TAG.GAME_UPDATE;
    let remainingPlayer = players.find((player) => player.id !== this.playerId);
    let me = players.find((player) => player.id === this.playerId);

    if (this.brickWall === !me.brickWall || this.brickWall === 0) {
      console.log('Bat dau di chuyen ...');
      this.isRunning = true;
      let algo = new AStar(map);
      let targets = algo.findTargets();

      let path = algo.findPath(
        [me.currentPosition.col, me.currentPosition.row],
        targets[0],
      );

      let arrPath = path.split('b');
      arrPath[0] = arrPath[0].slice(0, -1);

      this.socket.emit('drive player', {
        direction: arrPath[0],
      });

      this.socket.emit('drive player', {
        direction: arrPath.join('b'),
      });
    }
  }

  _onPlayerStartMoving(res) {
    let { id } = res;
  }
}

module.exports = GameClient;
