const {
  TAG,
  ITEM,
  MAP,
  ACTION,
  SOCKET_EVENT,
  DIRECTIONS,
  DRIVE,
} = require('../config/constants');
const StrategyManager = require('./strategy/strategyManager');
const GameAnalyzer = require('./analize/gameAnalyzer');
const {
  findTargets,
  findShortestPath,
  findPositionSetBomb,
} = require('./pathfinding/AStar');

class GameClient {
  currentTag = null;

  constructor(socket, playerId) {
    this.socket = socket;
    this.playerId = playerId;

    this.state = {
      targets: [],
      player: {
        isStun: false,
        isGod: false,
        isSwapWeapon: false,
        isRunning: false,
        isStop: true,
        position: {
          x: 0,
          y: 0,
        },
        score: 0,
        brickWall: 0,
      },
    };
    // this.strategyManager = StrategyManager.getInstance();
    // this.analyzer = GameAnalyzer.getInstance();
  }

  onTicktack(res) {
    let { timestamp, tag } = res;
    console.log(`[${timestamp}] :: ${tag}`);

    switch (tag) {
      // Player tag
      case TAG.GAME_START:
      case TAG.GAME_UPDATE:
        this._onGameUpdate(res);
        break;

      // CASE PLAYER
      case TAG.PLAYER_MOVING_BANNED:
        this._onPlayerMovingBanned(res);
        break;
      case TAG.PLAYER_START_MOVING:
        this._onPlayerStartMoving(res);
        break;
      case TAG.PLAYER_STOP_MOVING:
        this._onPlayerStopMoving(res);
        break;

      case TAG.PLAYER_TRANSFORMED:
        this._onPlayerTransformed(res);
        break;
      // case TAG.PLAYER_INTO_WEDDING_ROOM:
      // case TAG.PLAYER_OUTTO_WEDDING_ROOM:
      // case TAG.PLAYER_COMPLETED_WEDDING:

      // // CASE BOMB
      // case TAG.BOMB_SETUP:
      //   if (this.state.player.isGod) this._onBombSetup(res);
      // case TAG.BOMB_EXPLODED:
      //   if (this.state.player.isGod) this._onBombExploded(res);

      // // CASE WWEAPON
      // case TAG.WOODEN_PESTLE_SETUP:
      // case TAG.HAMMER_EXPLODED:
      // case TAG.WIND_EXPLODED:
      default:
        break;
    }
  }

  onDrivePlayer(res) {
    console.log('Drive player:');
  }

  // FUNCTION FOR TICKTACK PLAYER
  _onGameStart(res) {
    this._controlCharactor(res);
  }

  _onGameUpdate(res) {
    const { map_info } = res;
    const { players, map, bombs, spoils, weaponHammers, weaponWinds } =
      map_info;

    this._updatePlayerState(players.filter((p) => p.id === this.playerId)[0]);
    // 1. Check stun
    if (this.state.player.isStun) return;

    // 2. Check danger zone (bomb, hammer, wind)

    // 3. Using strategy to move
    if (this.state.player.isGod) {
      // 3.1. Find balk to setup bomb
      this.state.targets = findPositionSetBomb(
        map,
        MAP.BALK,
        this.state.player.position,
      );

      let bestWay = findShortestPath(
        map,
        this.state.player.position,
        this.state.targets,
      );

      if (!this.state.player.isRunning) {
        this.socket.emit(SOCKET_EVENT.DRIVE_PLAYER, {
          direction: bestWay,
        });
        this.state.player.isRunning = true;
      }
    } else {
      // 3.2. Find God badge
      this.state.targets = findTargets(map, MAP.GOD_BAGDE);

      let bestWay = findShortestPath(
        map,
        this.state.player.position,
        this.state.targets,
      );

      if (!this.state.player.isRunning) {
        this.socket.emit(SOCKET_EVENT.DRIVE_PLAYER, {
          direction: bestWay,
        });
        this.state.player.isRunning = true;
      }
    }
  }

  _onPlayerMovingBanned(res) {
    let competitor = res.map_info.players.filter(
      (p) => p.id !== this.playerId,
    )[0];

    if (
      competitor.currentPosition.col === targets[0].x &&
      competitor.currentPosition.row === targets[0].y
    ) {
      this.state.targets.shift();
    }
  }

  _onPlayerStartMoving(res) {
    this.state.player.isStop = false;
  }

  _onPlayerStopMoving(res) {
    if (!this.state.player.isStop) {
      this.state.player.isStop = true;
    } else {
      this.state.player.isRunning = false;
      this.socket.emit(SOCKET_EVENT.DRIVE_PLAYER, {
        direction: DRIVE.USE_WEAPON,
      });
    }
  }

  _onPlayerIsolated(res) {}

  _onPlayerComeback(res) {}

  _onPlayerPickSpoil(res) {}

  _onPlayerStunByWeapon(res) {}

  _onPlayerStunTimeout(res) {}

  _onPlayerTransformed(res) {
    this.state.player.isGod = true;

    // Switch weapon
    this.socket.emit(SOCKET_EVENT.ACTION, {
      action: ACTION.SWITCH_WEAPON,
    });
  }

  _onPlayerIntoWeddingRoom(res) {}

  _onPlayerOuttoWeddingRoom(res) {}

  _onPlayerCompletedWedding(res) {}

  _onBombSetup(res) {
    const { map_info } = res;
    const { players, map, bombs } = map_info;

    // Run away
    let hasWayOut = false;
    for (const [dir1, [dx1, dy1]] of Object.entries(DIRECTIONS)) {
      const nx1 = this.state.player.position.x + dx1;
      const ny1 = this.state.player.position.y + dy1;

      if (map[ny1][nx1] === MAP.EMPTY_CELL) {
        for (const [dir2, [dx2, dy2]] of Object.entries(DIRECTIONS).reverse()) {
          if ((dir1 + dir2) % 3 == 0) continue;
          const nx2 = nx1 + dx2;
          const ny2 = ny1 + dy2;

          if (map[ny2][nx2] === MAP.EMPTY_CELL) {
            this.socket.emit(SOCKET_EVENT.DRIVE_PLAYER, {
              direction: dir1 + dir2,
            });
            hasWayOut = true;
            break;
          }
        }
      }

      if (hasWayOut) break;
    }
  }

  _onBombExploded(res) {}

  _onWoodenPestleSetup(res) {}

  _onHammerExploded(res) {}

  _onWindExploded(res) {}

  _controlCharactor(res) {
    const { map_info } = res;

    // MAP_INFO
    const {
      size,
      players,
      map,
      bombs,
      spoils,
      weaponHammers,
      weaponWinds,
      gameStatus,
      cellSize,
    } = map_info;

    let currentHero = players.filter((p) => p.id === this.playerId)[0];

    this.state.player.position.x = currentHero.currentPosition.col;
    this.state.player.position.y = currentHero.currentPosition.row;
    this.state.player.isGod = currentHero.hasTransform;

    if (
      this.state.targets.length > 0 &&
      this.state.player.position.x === this.state.targets[0][0] &&
      this.state.player.position.y === this.state.targets[0][1]
    ) {
      // Setup bomb
      this.socket.emit(SOCKET_EVENT.DRIVE_PLAYER, {
        direction: DRIVE.USE_WEAPON,
      });
      this.state.targets.shift();
      // Check around
    }

    if (this.state.player.isGod) {
      if (!this.isRunning) {
        this.state.targets = findPositionSetBomb(
          map,
          MAP.BALK,
          this.state.player.position,
        );

        let shortestPath = findShortestPath(
          map,
          [this.state.player.position.x, this.state.player.position.y],
          [this.state.targets[0]],
        );

        // if (!this.state.player.isSwapWeapon) {
        //   this.socket.emit(SOCKET_EVENT.ACTION, {
        //     action: ACTION.SWITCH_WEAPON,
        //   });
        //   this.state.player.isSwapWeapon = true;
        // }
        this.socket.emit(SOCKET_EVENT.DRIVE_PLAYER, {
          direction: shortestPath,
        });

        console.log('Drive::', shortestPath);
      }
    } else {
      if (!this.isRunning) {
        this.state.targets = findTargets(map, MAP.GOD_BAGDE);
        this.state.isRunning = true;
        console.log('Running...');
        let shortestPath = findShortestPath(
          map,
          [this.state.player.position.x, this.state.player.position.y],
          this.state.targets,
        );

        this.socket.emit(SOCKET_EVENT.DRIVE_PLAYER, {
          direction: shortestPath,
        });

        this.state.player.isRunning = true;
      }
    }
  }

  // *** FUNCTION SUPPORT ***

  _updatePlayerState(player) {
    this.state.player.position.x = player.currentPosition.col;
    this.state.player.position.y = player.currentPosition.row;
    this.state.player.isGod = player.hasTransform;
    this.state.player.score = player.score;
  }
}

module.exports = GameClient;
