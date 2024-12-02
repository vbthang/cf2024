const {
  TAG,
  ITEM,
  MAP,
  ACTION,
  SOCKET_EVENT,
  DIRECTIONS,
  DRIVE,
  ITEM_SCORE,
} = require('../config/constants');
const strategyManager = require('./strategy/strategyManager');
const gameAnalyzer = require('./analize/gameAnalyzer');
const {
  findTargets,
  findShortestPath,
  findPositionSetBomb,
  findNearSafePosition,
} = require('./pathfinding/AStar');

class GameClient {
  currentTag = null;

  constructor(socket, playerId) {
    this.socket = socket;
    this.playerId = playerId;

    this.state = {
      mode: 'NORMAL',
      // NORMAL, DANGER
      targets: [],
      status: 'DO_NOTHING',
      // DO_NOTHING, FIND_GOD_BAGDE, FIND_BALK, RUN_AWAY
      player: {
        isStun: false,
        isGod: false,
        isSwapWeapon: false,
        isRunning: false,
        isStop: true,
        isBlocked: true,
        setupBomb: false,
        position: {
          x: 0,
          y: 0,
        },
        score: 0,
        brickWall: 0,
      },
    };
  }

  onTicktack(res) {
    const { timestamp, tag } = res;

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
      case TAG.BOMB_SETUP:
        this._onBombSetup(res);
        break;
      case TAG.BOMB_EXPLODED:
        this._onBombExploded(res);
        break;

      // // CASE WWEAPON
      case TAG.WOODEN_PESTLE_SETUP:
        this._onWoodenPestleSetup(res);
        break;
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
  _onGameStart(res) {}

  _onGameUpdate(res) {
    const { map_info } = res;
    const { players, map, bombs, spoils } = map_info;

    this._updatePlayerState(players.filter((p) => p.id === this.playerId)[0]);

    // 0. Is target
    if (this.state.targets.length > 0) {
      if (
        this.state.player.position.x === this.state.targets[0][0] &&
        this.state.player.position.y === this.state.targets[0][1]
      ) {
        this.state.targets.shift();
        this.state.player.isRunning = false;
        if (this.state.status === 'SETUP_BOMB') {
          this.setupBomb();
        }
      }
    }

    // 1. Check stun
    if (this.state.player.isStun) return;

    // 2. Check danger zone (bomb, hammer, wind)
    if (bombs.length > 0) {
    }

    // 3. Using strategy to move
    if (this.state.player.isGod) {
      this.handleGodMode(res);
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
    const { map } = res.map_info;

    if (!this.state.player.isStop) {
      this.state.player.isStop = true;
    } else {
      this.state.player.isRunning = false;
      console.log('Player stop moving');

      if (this.state.player.isSwapWeapon && this.state.player.isGod) {
        console.log('Gặp vật cản ==> đổi vũ khí');
        this.socket.emit(SOCKET_EVENT.ACTION, {
          action: ACTION.SWITCH_WEAPON,
        });

        this.socket.emit(SOCKET_EVENT.DRIVE_PLAYER, {
          direction: DRIVE.USE_WEAPON,
        });
      } else {
        this.socket.emit(SOCKET_EVENT.DRIVE_PLAYER, {
          direction: DRIVE.USE_WEAPON,
        });
      }
    }
  }

  _onPlayerIsolated(res) {}

  _onPlayerComeback(res) {}

  _onPlayerPickSpoil(res) {}

  _onPlayerStunByWeapon(res) {}

  _onPlayerStunTimeout(res) {}

  _onPlayerTransformed(res) {
    console.log('Biến thành thần');

    this.state.player.isGod = true;

    this.state.player.isSwapWeapon = true;

    this.socket.emit(SOCKET_EVENT.ACTION, {
      action: ACTION.SWITCH_WEAPON,
    });
  }

  _onPlayerIntoWeddingRoom(res) {}

  _onPlayerOuttoWeddingRoom(res) {}

  _onPlayerCompletedWedding(res) {}

  _onBombSetup(res) {
    const { map_info } = res;
    const { bombs, map } = map_info;

    this.state.player.setupBomb = true;
    this.setStatus('RUN_AWAY');

    this.state.targets = findNearSafePosition(
      map,
      bombs,
      this.state.player.position,
    );

    console.log('Chạy đến vị trí an toàn:', this.state.targets);
    console.log('Vị trí hiện tại:', this.state.player.position);

    let bestWay = findShortestPath(
      map,
      this.state.player.position,
      this.state.targets,
    );

    console.log('--***--');

    console.log('Best way:', bestWay);

    this._drivePlayer(bestWay);
    this.setStatus('WAIT');

    // this.socket.emit(SOCKET_EVENT.ACTION, {
    //   action: ACTION.SWITCH_WEAPON,
    // });
  }

  _onBombExploded(res) {
    if (this.state.status === 'SETUP_BOMB') {
      this.state.player.setupBomb = true;

      if (!this.state.player.isSwapWeapon) {
        this.socket.emit(SOCKET_EVENT.ACTION, {
          action: ACTION.SWITCH_WEAPON,
        });
      }
    }
    console.log('Bomb nổ rồi đi ăn thôi');

    this.setStatus('TAKE_SPOIL');
  }

  _onWoodenPestleSetup(res) {
    if (this.state.player.isGod) {
      if (!this.state.player.isSwapWeapon) {
        this.socket.emit(SOCKET_EVENT.ACTION, {
          action: ACTION.SWITCH_WEAPON,
        });
      }
    }
    // if (isGod) {
    //   if (!this.state.player.isSwapWeapon) {
    //     this.socket.emit(SOCKET_EVENT.ACTION, {
    //       action: ACTION.SWITCH_WEAPON,
    //     });
    //   }
    // }
  }

  _onHammerExploded(res) {}

  _onWindExploded(res) {}

  // *** FUNCTION SUPPORT ***

  _updatePlayerState(player) {
    this.state.player.position.x = player.currentPosition.col;
    this.state.player.position.y = player.currentPosition.row;
    this.state.player.isGod = player.hasTransform;
    this.state.player.score = player.score;
    this.state.player.isSwapWeapon = player.currentWeapon === 2;
  }

  _drivePlayer(bestWay) {
    this.socket.emit(SOCKET_EVENT.DRIVE_PLAYER, {
      direction: bestWay,
    });
    if (bestWay) {
      if (this.state.player.isGod) {
        if (!this.state.player.isSwapWeapon)
          this.socket.emit(SOCKET_EVENT.ACTION, {
            action: ACTION.SWITCH_WEAPON,
          });
      }
      this.state.player.direction = bestWay[bestWay.length - 1];
      this.state.player.isRunning = true;
      console.log('bestWay:', bestWay[-1]);
    }
  }

  handleGodMode(res) {
    console.log('God Mode');

    const { map_info } = res;
    const { map, players, spoils } = map_info;

    // console.log(this.state.status);

    switch (this.state.status) {
      case 'DO_NOTHING':
        console.log('DO_NOTHING');
        const bestPosToSetupBomb = findPositionSetBomb(
          map,
          MAP.BALK,
          this.state.player.position,
        );

        if (bestPosToSetupBomb.length !== 0) {
          let bestWay = findShortestPath(
            map,
            this.state.player.position,
            bestPosToSetupBomb,
          );

          if (bestWay.length === 0) {
            console.log('Đứng cạnh vật phẩm ==> đặt bomb luôn');
            this.setupBomb();
            return;
          }

          console.log('Di chuyển tới vị trí đặt bomb với bestWay:', bestWay);
          this.state.status = 'SETUP_BOMB';
          this._drivePlayer(bestWay);
        } else {
          console.log('Hết vật phẩm để đặt bomb');
        }
        break;
      case 'SETUP_BOMB':
        if (this.state.targets.length !== 0) {
          if (
            this.state.player.position.x === this.state.targets[0][0] &&
            this.state.player.position.y === this.state.targets[0][1]
          ) {
            console.log('Đến nơi rồi thả nhẹ quả bomb');
            this.setupBomb();
          } else {
            console.log('Mục tiêu', this.state.targets);
            console.log('Vị trí hiện tại', this.state.player.position);
            let bestWay = findShortestPath(
              map,
              this.state.player.position,
              this.state.targets,
            );
            this._drivePlayer(bestWay);
          }
        } else {
          console.log(
            'Chả có mục tiêu nào cả, tìm kiếm mục tiêu thôi => pằng pằng',
          );
          this.setStatus('DO_NOTHING');
        }

        console.log('SETUP_BOMB');
        break;
      case 'TAKE_SPOIL':
        if (spoils.length !== 0) {
          let sortedSpoils = spoils.sort((a, b) => {
            return ITEM_SCORE[a.spoil_type] - ITEM_SCORE[b.spoil_type];
          });

          console.log(sortedSpoils);

          for (let spoil of sortedSpoils) {
            if (
              Math.abs(spoil.row - this.state.player.position.y) >= 7 ||
              Math.abs(spoil.col - this.state.player.position.x) >= 7
            ) {
              console.log('Vật phẩm xa rồi');
              continue;
            }

            this.state.targets = [[spoil.col, spoil.row]];
            let bestWay = findShortestPath(
              map,
              this.state.player.position,
              this.state.targets,
            );

            console.log('Target::', this.state.targets);
            console.log('Best way::', bestWay);

            this._drivePlayer(bestWay);
            return;
          }
        }
        this.setStatus('DO_NOTHING');
        console.log('TAKE_SPOIL');
        break;
      case 'RUN_AWAY':
        console.log('Target', this.state.targets);
        if (this.state.targets.length !== 0) {
          if (
            this.state.player.position.x === this.state.targets[0][0] &&
            this.state.player.position.y === this.state.targets[0][1]
          ) {
            this.state.targets.shift();
            this.state.player.isRunning = false;
            console.log('Đến nơi an toàn rồi');
            this.setStatus('WAIT');
          }
        } else {
          this.setStatus('DO_NOTHING');
        }

        console.log('RUN_AWAY');
        break;
      case 'WAIT':
        console.log('Chờ xiusuuuuuuuuuu !!!');
        console.log('WAIT');
        break;
    }
  }

  // *** FUNCTION SUPPORT ***
  setupBomb(nextAct = 'TAKE_SPOIL') {
    if (!this.state.player.isSwapWeapon) {
      this.socket.emit(SOCKET_EVENT.ACTION, {
        action: ACTION.SWITCH_WEAPON,
      });
    }

    this.socket.emit(SOCKET_EVENT.DRIVE_PLAYER, {
      direction: DRIVE.USE_WEAPON,
    });

    this.state.status = nextAct;
  }

  setStatus(status) {
    this.state.status = status;
  }
}

module.exports = GameClient;
