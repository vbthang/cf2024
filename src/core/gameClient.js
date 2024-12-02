const {
  TAG,
  ITEM,
  MAP,
  ACTION,
  SOCKET_EVENT,
  DIRECTIONS,
  DRIVE,
  ITEM_SCORE,
  PLAYER_STATUS,
} = require('../config/constants');
const {
  findTargets,
  findShortestPath,
  findPositionSetBomb,
  findNearSafePosition,
  findPathToTarget,
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
      status: PLAYER_STATUS.DO_NOTHING,
      // DO_NOTHING, FIND_GOD_BAGDE, FIND_BALK, RUN_AWAY
      player: {
        isStun: false,
        isGod: false,
        isSwapWeapon: false,
        isRunning: false,
        isStop: true,
        isBlocked: false,
        isMove: false,
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
    // if (this.state.targets.length > 0) {
    //   if (
    //     this.state.player.position.x === this.state.targets[0][0] &&
    //     this.state.player.position.y === this.state.targets[0][1]
    //   ) {
    //     this.state.targets.shift();
    //     this.state.player.isRunning = false;
    //     if (this.state.status === 'SETUP_BOMB') {
    //       this.setupBomb();
    //     }
    //   }
    // }

    // 1. Check stun
    if (this.state.player.isStun) return;

    // 2. Check danger zone (bomb, hammer, wind)
    if (bombs.length > 0) {
    }

    // 3. Using strategy to move
    if (!this.state.player.isRunning) {
      console.log('Check xem có target không:', this.state.targets);
      if (this.state.targets.length !== 0) {
        let bestWay = findShortestPath(
          map,
          this.state.player.position,
          this.state.targets,
        );

        if (bestWay) {
          console.log('Bắt đầu di chuyển');
          this._drivePlayer(bestWay);
          this.state.player.isRunning = true;
          return;
        }
      }
    }

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
      console.log('Huy hiệu đã bị cướp');
      this.state.targets.shift();
      this.state.player.isRunning = false;
    }
  }

  _onPlayerStartMoving(res) {
    // this.state.player.isStop = false;
    this.state.player.isMove = true;
  }

  _onPlayerStopMoving(res) {
    const { map } = res.map_info;

    let competitor = res.map_info.players.filter(
      (p) => p.id !== this.playerId,
    )[0];

    if (!this.state.player.isMove) {
      console.log('Player bị chặn');
      this.state.player.isBlocked = true;
      if (
        competitor.currentPosition.col === this.state.targets[0].x &&
        competitor.currentPosition.row === this.state.targets[0].y
      ) {
        console.log('Huy hiệu đã bị cướp');
        this.state.targets.shift();
        this.state.player.isRunning = false;
        return;
      }
    } else {
      this.state.player.isMove = false;
    }

    if (this.state.player.isBlocked) {
      this.state.player.isRunning = false;
      console.log('Current position:', [
        this.state.player.position.x,
        this.state.player.position.y,
      ]);
      console.log('Targets:', this.state.targets);

      let bestWay = findShortestPath(
        map,
        this.state.player.position,
        this.state.targets,
      );

      if (bestWay) {
        let firstDirection = bestWay[0];
        if (firstDirection) {
          let nextPos = DIRECTIONS[firstDirection];
          if (
            map[this.state.player.position.y + nextPos[1]][
              this.state.player.position.x + nextPos[0]
            ] === MAP.BRICK_WALL
          ) {
            if (this.state.player.isGod) {
              if (this.state.player.isSwapWeapon) {
                this.socket.emit(SOCKET_EVENT.ACTION, {
                  action: ACTION.SWITCH_WEAPON,
                });
              }
            }
            this.socket.emit(SOCKET_EVENT.DRIVE_PLAYER, {
              direction: DRIVE.USE_WEAPON,
            });
          }
        }
      }

      // this.state.player.isBlocked = false;
    }

    // if (!this.state.player.isStop) {
    //   this.state.player.isStop = true;
    // } else {
    //   this.state.player.isRunning = false;
    //   console.log('Player stop moving');

    //   if (this.state.player.isSwapWeapon && this.state.player.isGod) {
    //     console.log('Gặp vật cản ==> đổi vũ khí');
    //     this.socket.emit(SOCKET_EVENT.ACTION, {
    //       action: ACTION.SWITCH_WEAPON,
    //     });

    //     this.socket.emit(SOCKET_EVENT.DRIVE_PLAYER, {
    //       direction: DRIVE.USE_WEAPON,
    //     });
    //   } else {
    //     this.socket.emit(SOCKET_EVENT.DRIVE_PLAYER, {
    //       direction: DRIVE.USE_WEAPON,
    //     });
    //   }
    // }
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

    const currentPos = [
      this.state.player.position.x,
      this.state.player.position.y,
    ];

    this.state.targets = findNearSafePosition(map, bombs, currentPos);

    let bestWay = findShortestPath(
      map,
      this.state.player.position,
      this.state.targets,
    );

    console.log('Vị trí hiện tại:', this.state.player.position);
    console.log('Vị trí an toàn:', this.state.targets);
    console.log('Đường đi:', bestWay);

    this._drivePlayer(bestWay);
    this.setStatus(PLAYER_STATUS.RUN_AWAY);
  }

  _onBombExploded(res) {
    if (this.state.status === PLAYER_STATUS.SETUP_BOMB) {
      if (!this.state.player.isSwapWeapon) {
        this.socket.emit(SOCKET_EVENT.ACTION, {
          action: ACTION.SWITCH_WEAPON,
        });
      }
    }
    console.log('Bomb nổ rồi đi ăn thôi');

    this.setStatus(PLAYER_STATUS.TAKE_SPOIL);
  }

  _onWoodenPestleSetup(res) {
    if (this.state.player.isGod) {
      if (!this.state.player.isSwapWeapon) {
        this.socket.emit(SOCKET_EVENT.ACTION, {
          action: ACTION.SWITCH_WEAPON,
        });
      }
    }

    const currentPos = [
      this.state.player.position.x,
      this.state.player.position.y,
    ];
    let dest = this.state.targets[0];

    if (currentPos[0] === dest[0] && currentPos[1] === dest[1]) {
      return;
    } else {
      this.state.player.isBlocked = false;
      // this.state.player.isRunning = false;
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
    console.log('GO GO GO!!!');
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
      this.state.player.isRunning = true;
    }
  }

  handleGodMode(res) {
    console.log('God Mode');

    const { map_info } = res;
    const { map, players, bombs, spoils } = map_info;

    // HANDLE FOLLOW STATUS

    console.log('Status::', this.state.status);
    console.log('Target::', this.state.targets);
    console.log('Position::', [
      this.state.player.position.x,
      this.state.player.position.y,
    ]);

    switch (this.state.status) {
      case PLAYER_STATUS.DO_NOTHING:
        // Find pos to setup bomb
        const bestPosToSetupBomb = findPositionSetBomb(
          map,
          MAP.BALK,
          this.state.player.position,
        );

        let currentPos = [
          this.state.player.position.x,
          this.state.player.position.y,
        ];

        if (bestPosToSetupBomb) {
          if (
            currentPos[0] === bestPosToSetupBomb[0] &&
            currentPos[1] === bestPosToSetupBomb[1]
          ) {
            console.log('Đứng cạnh vật phẩm ==> Đặt bomb luôn');
            this.setupBomb();
            return;
          } else {
            let { path: bestWay } = findPathToTarget(
              map,
              currentPos,
              bestPosToSetupBomb,
            );

            if (bestWay) {
              console.log(
                'Di chuyển tới vị trí đặt bomb với bestWay:',
                bestWay,
              );
              this.setStatus(PLAYER_STATUS.SETUP_BOMB);
              this._drivePlayer(bestWay);
              this.state.targets = [bestPosToSetupBomb];
            }
          }
        } else {
          console.log('Hết chỗ để đặt bomb :<<');
        }
        break;
      case PLAYER_STATUS.SETUP_BOMB:
        if (this.state.targets.length !== 0) {
          if (
            this.state.player.position.x === this.state.targets[0][0] &&
            this.state.player.position.y === this.state.targets[0][1]
          ) {
            console.log('Đến nơi rồi thả nhẹ quả bomb');
            this.setupBomb();
            return;
          }
          // else {
          //   console.log('Mục tiêu', this.state.targets);
          //   console.log('Vị trí hiện tại', this.state.player.position);
          //   let bestWay = findShortestPath(
          //     map,
          //     this.state.player.position,
          //     this.state.targets,
          //   );
          //   this._drivePlayer(bestWay);
          // }
        } else {
          console.log('Chả có mục tiêu nào cả');
          this.setStatus(PLAYER_STATUS.DO_NOTHING);
        }
        break;
      case PLAYER_STATUS.TAKE_SPOIL:
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
        this.setStatus(PLAYER_STATUS.DO_NOTHING);
        console.log('TAKE_SPOIL');
        break;
      case PLAYER_STATUS.RUN_AWAY:
        console.log('Target', this.state.targets);
        if (this.state.targets.length !== 0) {
          if (
            this.state.player.position.x === this.state.targets[0][0] &&
            this.state.player.position.y === this.state.targets[0][1]
          ) {
            this.state.targets.shift();
            this.state.player.isRunning = false;
            console.log('Đến nơi an toàn rồi');
            this.setStatus(PLAYER_STATUS.WAIT);
          }
        } else {
          this.setStatus(PLAYER_STATUS.DO_NOTHING);
        }

        console.log('RUN_AWAY');
        break;
      case PLAYER_STATUS.WAIT:
        console.log('Chờ xiusuuuuuuuuuu !!!');
        console.log('WAIT');
        break;
    }
  }

  // *** FUNCTION SUPPORT ***
  setupBomb(nextAct = PLAYER_STATUS.TAKE_SPOIL) {
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
