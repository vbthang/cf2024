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
    // this.playerId = playerId.slice(0, 11);
    this.playerId = playerId.slice(0, 13);
    this.childId = `${this.playerId}_child`;

    this.state = {
      mode: 'NORMAL',
      // NORMAL, DANGER
      targets: [],
      status: PLAYER_STATUS.DO_NOTHING,
      // DO_NOTHING, FIND_GOD_BAGDE, FIND_BALK, RUN_AWAY
      player: {
        isStun: false,
        isGod: false,
        godType: 1,
        isSwapWeapon: false,
        isRunning: false,
        isStop: true,
        isBlocked: false,
        isMove: false,
        setupBomb: false,
        isMarried: false,
        position: {
          x: 0,
          y: 0,
        },
        score: 0,
        brickWall: 0,
      },
    };
    this.childState = {
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
      case TAG.PLAYER_COMPLETED_WEDDING:
        this._onPlayerCompletedWedding(res);
        break;
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
    const enemy = players.filter((p) => !this.playerId.includes(p.id))[0];
    const player = players.filter((p) => this.playerId.includes(p.id))[0];
    const child = players.filter((p) => p.id === this.childId)[0];
    this._updatePlayerState(player, 'parent');
    // kill enemy
    // if (
    //   player?.timeToUseSpecialWeapons > 0 &&
    //   player?.hasTransform &&
    //   enemy?.hasTransform
    // ) {
    //   this.useSonTinhWeapon({
    //     col: enemy?.currentPosition.col,
    //     row: enemy?.currentPosition.row,
    //   });
    // }
    // 1. Check stun
    if (this.state.player.isStun) return;

    // 2. Check danger zone (bomb, hammer, wind)

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

    if (bombs.length > 0) {
      // const currentPos = [
      //   this.state.player.position.x,
      //   this.state.player.position.y,
      // ];

      // this.state.targets = findNearSafePosition(map, bombs, currentPos);

      // let bestWay = findShortestPath(
      //   map,
      //   this.state.player.position,
      //   this.state.targets,
      // );

      // this._drivePlayer(bestWay);
      // this.setStatus(PLAYER_STATUS.RUN_AWAY);
      // return; // Dừng các logic khác để ưu tiên né bom
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

    this.checkEnemyPositionAndHandle(enemy);

    // Thang con
    if (child) {
      this._updatePlayerState(child, 'child');
      if (this.childState.player.isStun) return;

      // 2. Check danger zone (bomb, hammer, wind)
      if (bombs.length > 0) {
      }

      // 3. Using strategy to move
      if (!this.childState.player.isRunning) {
        console.log(
          'child: Check xem có target không:',
          this.childState.targets,
        );
        if (this.childState.targets.length !== 0) {
          let bestWay = findShortestPath(
            map,
            this.childState.player.position,
            this.childState.targets,
          );

          if (bestWay) {
            console.log('child: Bắt đầu di chuyển');
            this._drivePlayer(bestWay, 'child');
            this.childState.player.isRunning = true;
            return;
          }
        }
      }
      this.handleGodModeForChild(res);
    }
  }

  _onPlayerMovingBanned(res) {
    let competitor = res.map_info.players.filter(
      (p) => p.id !== this.playerId,
    )[0];

    if (
      competitor?.currentPosition.col === this.state?.targets[0]?.x &&
      competitor?.currentPosition.row === this.state?.targets[0]?.y
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
      this.state.player.isBlocked = true;
      console.log('Player bị chặn');
      if (
        competitor?.currentPosition.col === this.state?.targets[0]?.x &&
        competitor?.currentPosition.row === this.state?.targets[0]?.y
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
        console.log('best way: ', bestWay);
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
          } else if (
            this.state.player.position.y + nextPos[1] ==
              competitor?.currentPosition.row &&
            this.state.player.position.x + nextPos[0] ==
              competitor?.currentPosition.col
          ) {
            console.log('enemy');
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
            if (competitor.hasTransform) {
              this.socket.emit(SOCKET_EVENT.ACTION, {
                action: ACTION.SWITCH_WEAPON,
              });
              this.socket.emit(SOCKET_EVENT.DRIVE_PLAYER, {
                direction: DRIVE.USE_WEAPON,
              });
              return;
            }
          }
        }
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

  _onPlayerCompletedWedding(res) {
    this.state.player.isMarried = true;
  }

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
  }

  _onHammerExploded(res) {}

  _onWindExploded(res) {}

  // *** FUNCTION SUPPORT ***

  _updatePlayerState(player, character) {
    if (character === 'parent') {
      console.log('playerPosition:  ', player?.currentPosition);
      this.state.player.position.x = player?.currentPosition.col;
      this.state.player.position.y = player?.currentPosition.row;
      this.state.player.isGod = player?.hasTransform;
      this.state.player.score = player?.score;
      this.state.player.isSwapWeapon = player?.currentWeapon === 2;

      if (player?.eternalBadge && !this.state.player.isMarried) {
        this.socket.emit(SOCKET_EVENT.ACTION, {
          action: ACTION.MARRY_WIFE,
        });
      }

      if (this.childState.player.position.x !== 0) {
        this.state.player.isMarried = true;
      }
    } else {
      this.childState.player.position.x = player?.currentPosition.col;
      this.childState.player.position.y = player?.currentPosition.row;
      this.childState.player.isGod = true;
      this.childState.player.score = player?.score;
      this.childState.player.isSwapWeapon = player?.currentWeapon === 2;
    }
  }

  _drivePlayer(bestWay, characterType) {
    console.log('GO GO GO!!!');
    this.socket.emit(SOCKET_EVENT.DRIVE_PLAYER, {
      direction: bestWay,
      characterType,
    });
    if (bestWay) {
      if (characterType) {
        if (!this.childState.player.isSwapWeapon)
          this.socket.emit(SOCKET_EVENT.ACTION, {
            action: ACTION.SWITCH_WEAPON,
            characterType: characterType,
          });
        this.childState.player.isRunning = true;
      }
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
            // this.setStatus(PLAYER_STATUS.SETUP_BOMB);
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
  //Child Func Handler
  handleGodModeForChild(res) {
    console.log('Child: God Mode');

    const { map_info } = res;
    const { map, players, bombs, spoils } = map_info;

    // HANDLE FOLLOW STATUS

    console.log('child: StateStatus::', this.childState.status);
    console.log('child: StateTarget::', this.childState.targets);
    console.log('child: StatePosition::', [
      this.childState.player.position.x,
      this.childState.player.position.y,
    ]);

    switch (this.childState.status) {
      case PLAYER_STATUS.DO_NOTHING:
        // Find pos to setup bomb
        const bestPosToSetupBomb = findPositionSetBomb(
          map,
          MAP.BALK,
          this.childState.player.position,
        );

        let currentPos = [
          this.childState.player.position.x,
          this.childState.player.position.y,
        ];

        if (bestPosToSetupBomb) {
          if (
            currentPos[0] === bestPosToSetupBomb[0] &&
            currentPos[1] === bestPosToSetupBomb[1]
          ) {
            console.log('child: Đứng cạnh vật phẩm ==> Đặt bomb luôn');
            this.setupBombForChild();
            return;
          } else {
            let { path: bestWay } = findPathToTarget(
              map,
              currentPos,
              bestPosToSetupBomb,
            );

            if (bestWay) {
              console.log(
                'child: Di chuyển tới vị trí đặt bomb với bestWay:',
                bestWay,
              );
              this.setStatus(PLAYER_STATUS.SETUP_BOMB, 'child');
              this._drivePlayer(bestWay, 'child');
              this.childState.targets = [bestPosToSetupBomb];
            }
          }
        } else {
          console.log('child: Hết chỗ để đặt bomb :<<');
        }
        break;
      case PLAYER_STATUS.SETUP_BOMB:
        if (this.childState.targets.length !== 0) {
          if (
            this.childState.player.position.x ===
              this.childState.targets[0][0] &&
            this.childState.player.position.y === this.childState.targets[0][1]
          ) {
            console.log('child: Đến nơi rồi thả nhẹ quả bomb');
            this.setupBombForChild();
            return;
          }
        } else {
          console.log('child: Chả có mục tiêu nào cả');
          this.setStatus(PLAYER_STATUS.DO_NOTHING, 'child');
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
              Math.abs(spoil.row - this.childState.player.position.y) >= 7 ||
              Math.abs(spoil.col - this.childState.player.position.x) >= 7
            ) {
              console.log('child: Vật phẩm xa rồi');
              continue;
            }

            this.childState.targets = [[spoil.col, spoil.row]];
            let bestWay = findShortestPath(
              map,
              this.childState.player.position,
              this.childState.targets,
            );

            console.log('child: StateTarget::', this.childState.targets);
            console.log('child: StateBest way::', bestWay);

            this._drivePlayer(bestWay, 'child');
            return;
          }
        }
        this.setStatus(PLAYER_STATUS.DO_NOTHING, 'child');
        console.log('child: TAKE_SPOIL');
        break;
      case PLAYER_STATUS.RUN_AWAY:
        console.log('child: Target', this.childState.targets);
        if (this.childState.targets.length !== 0) {
          if (
            this.childState.player.position.x ===
              this.childState.targets[0][0] &&
            this.childState.player.position.y === this.childState.targets[0][1]
          ) {
            this.childState.targets.shift();
            this.childState.player.isRunning = false;
            console.log('child: Đến nơi an toàn rồi');
            this.setStatus(PLAYER_STATUS.WAIT, 'child');
          }
        } else {
          this.setStatus(PLAYER_STATUS.DO_NOTHING, 'child');
        }

        console.log('child: RUN_AWAY');
        break;
      case PLAYER_STATUS.WAIT:
        console.log('child: Chờ xiusuuuuuuuuuu !!!');
        console.log('child: WAIT');
        break;
    }
  }

  setupBombForChild(nextAct = PLAYER_STATUS.TAKE_SPOIL) {
    if (!this.childState.player.isSwapWeapon) {
      this.socket.emit(SOCKET_EVENT.ACTION, {
        action: ACTION.SWITCH_WEAPON,
        characterType: 'child',
      });
    }

    this.socket.emit(SOCKET_EVENT.DRIVE_PLAYER, {
      direction: DRIVE.USE_WEAPON,
      characterType: 'child',
    });

    this.childState.status = nextAct;
  }

  childAvoidBom(bombs, map) {
    const currentPos = [
      this.childState.player.position.x,
      this.childState.player.position.y,
    ];

    this.childState.targets = findNearSafePosition(map, bombs, currentPos);

    let bestWay = findShortestPath(
      map,
      this.childState.player.position,
      this.childState.targets,
    );

    console.log('child: Vị trí hiện tại:', this.childState.player.position);
    console.log('child: Vị trí an toàn:', this.childState.targets);
    console.log('child: Đường đi:', bestWay);

    this._drivePlayer(bestWay, 'child');
    this.setStatus(PLAYER_STATUS.RUN_AWAY, 'child');
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

  setStatus(status, character) {
    if (character) {
      this.childState.status = status;
      return;
    }
    this.state.status = status;
  }

  useSonTinhWeapon(payload) {
    console.log('useSonTinhWeapon', payload);
    this.socket.emit(SOCKET_EVENT.ACTION, {
      action: ACTION.USE_WEAPON,
      payload,
    });
    return;
  }

  useThuyTinhWeapon() {
    this.socket.emit(SOCKET_EVENT.ACTION, {
      action: ACTION.USE_WEAPON,
    });
    return;
  }

  stunEnemy() {
    if (this.state.player.isSwapWeapon) {
      this.socket.emit(SOCKET_EVENT.ACTION, {
        action: ACTION.SWITCH_WEAPON,
      });
    }
    this.socket.emit(SOCKET_EVENT.DRIVE_PLAYER, {
      direction: DRIVE.USE_WEAPON,
    });
  }

  stunAndSetBom() {
    console.log('action: stun and set bom');
    if (this.state.player.isSwapWeapon) {
      this.socket.emit(SOCKET_EVENT.ACTION, {
        action: ACTION.SWITCH_WEAPON,
      });
    }
    this.socket.emit(SOCKET_EVENT.DRIVE_PLAYER, {
      direction: DRIVE.USE_WEAPON,
    });
    this.socket.emit(SOCKET_EVENT.ACTION, {
      action: ACTION.SWITCH_WEAPON,
    });
    this.socket.emit(SOCKET_EVENT.DRIVE_PLAYER, {
      direction: DRIVE.USE_WEAPON,
    });
    return;
  }

  checkEnemyPositionAndHandle(enemy) {
    let analysisEnemy = {
      tag: '',
      payload: {},
    };
    const currentPosition = enemy?.currentPosition;
    const distance =
      Math.abs(this.state.player.position.x - currentPosition.col) +
      Math.abs(this.state.player.position.y - currentPosition.row);
    if (this.state.player.isGod) {
      if (this.state.player.godType == 1) {
        if (
          distance <= 7 &&
          distance >= 5 &&
          enemy.hasTransform &&
          this.state.player.timeToUseSpecialWeapons > 0
        ) {
          analysisEnemy.tag = 'canUseSonTinhWeapon';
          analysisEnemy.payload = {
            destination: {
              col: currentPosition.col,
              row: currentPosition.row,
            },
          };
        } else if (distance == 1) {
          analysisEnemy.tag = 'canStunAndSetUpBom';
        }
      } else if (this.state.player.godType == 2) {
        // xử lý bắn đạn của thủy tinh
        analysisEnemy.tag = 'canUseThuyTinhWeapon';
      }
    } else {
      if (distance == 1) {
        analysisEnemy.tag = 'canStunEnemy';
      }
    }

    this.handleWhenEnemyIsNearby(analysisEnemy);
    return;
  }

  handleWhenEnemyIsNearby(analysisEnemy) {
    switch (analysisEnemy.tag) {
      case 'canUseSonTinhWeapon':
        this.useSonTinhWeapon(analysisEnemy.payload);
        break;
      case 'canStunAndSetUpBom':
        this.stunAndSetBom;
        break;
      case 'canStunEnemy':
        this.stunEnemy;
        break;
      case 'canUseThuyTinhWeapon':
        this.useThuyTinhWeapon;
        break;
      default:
        break;
    }
  }
}

module.exports = GameClient;
