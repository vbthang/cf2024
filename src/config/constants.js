module.exports = {
  SOCKET_EVENT: {
    JOIN_GAME: 'join game',
    TICTACK_PLAYER: 'ticktack player',
    DRIVE_PLAYER: 'drive player',
    REGISTER_CHARACTER_POWER: 'register character power',
    ACTION: 'action',
  },
  MAP: {
    EMPTY_CELL: 0,
    STONE_WALL: 1,
    BALK: 2,
    BRICK_WALL: 3,
    PRISON: 5,
    GOD_BAGDE: 6,
    SPEC_CELL: 7,

    // Add
    BOMB: 8,
  },
  ITEM: {
    STICKY_RICE: 32, // 1 score
    CHUNG_CAKE: 33, // 2 score
    NINE_TUSK_ELEPHANT: 34, // 5 score
    NINE_SPUR_ROOTER: 35, // 3 score
    NINE_MANE_HAIR_HORSE: 36, // 4 score
    HOLY_SPIRIT_STONE: 37, // 3 score
  },
  ITEM_SCORE: {
    32: 1,
    33: 2,
    34: 5,
    35: 3,
    36: 4,
    37: 3,
  },
  CHARACTER: {
    MOUNTAIN_GOD: 1,
    SEA_GOD: 2,
  },
  DRIVE: {
    MOVE_LEFT: '1',
    MOVE_RIGHT: '2',
    MOVE_UP: '3',
    MOVE_DOWN: '4',
    USE_WEAPON: 'b',
    STOP_MOVE: 'x',
  },
  //   Using when have spec weapon
  ACTION: {
    SWITCH_WEAPON: 'switch weapon',
    USE_WEAPON: 'use weapon',
    MARRY_WIFE: 'marry wife',
  },
  TAG: {
    PLAYER_START_MOVING: 'player:start-moving',
    PLAYER_STOP_MOVING: 'player:stop-moving',
    PLAYER_MOVING_BANNED: 'player:moving-banned',
    PLAYER_ISOLATED: 'player:be-isolated',
    PLAYER_COMEBACK: 'player:back-to-playground',
    PLAYER_PICK_SPOIL: 'player:pick-spoil',
    PLAYER_STUN_BY_WEAPON: 'player:stun-by-weapon',
    PLAYER_STUN_TIMEOUT: 'player:stun-timeout',
    PLAYER_TRANSFORMED: 'player:transformed',

    PLAYER_INTO_WEDDING_ROOM: 'player:into-wedding-room',
    PLAYER_OUTTO_WEDDING_ROOM: 'player:outto-wedding-room',
    PLAYER_COMPLETED_WEDDING: 'player:wedding-completed',

    BOMB_SETUP: 'bomb:setup',
    BOMB_EXPLODED: 'bomb:exploded',

    GAME_START: 'start-game',
    GAME_UPDATE: 'update-data',

    WOODEN_PESTLE_SETUP: 'Wooden_pestle:setup',
    HAMMER_EXPLODED: 'hammer:exploded',
    WIND_EXPLODED: 'wind:exploded',
  },
  META_DATA: {
    DELAY_SETUP_BOMB: 2000,
    STUN: 3000,
  },
  DIRECTIONS: {
    1: [-1, 0],
    2: [1, 0],
    3: [0, -1],
    4: [0, 1],
  },

  // DEFINE FOR RUNTIME
  PLAYER_STATUS: {
    DO_NOTHING: 0,
    SETUP_BOMB: 1,
    RUN_AWAY: 2,
    WAIT: 3,
    TAKE_SPOIL: 4,
  },
};
