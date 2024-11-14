const io = require('socket.io-client');
const { SOCKET_EVENT } = require('./config/constants');
const GameClient = require('./core/gameClient');

module.exports = ({ apiServer, gameId, playerId, mode }) => {
  console.clear();
  console.log('='.repeat(30));
  console.log('   🎮 Game Configuration 🎮   ');
  console.log('='.repeat(30));
  console.log('🌐 Server URL   : %s', apiServer);
  console.log('🆔 Game ID      : %s', gameId);
  console.log('👤 Player ID    : %s', playerId);
  console.log('='.repeat(30));

  if (mode === 'compat') {
    console.log('🚀 *** COMPATIBILITY MODE *** 🚀');
  } else {
    console.log('    🛠️ *** DEV MODE *** 🛠️    ');
  }
  console.log('='.repeat(30));

  const socket = io.connect(apiServer, {
    reconnect: true,
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('[Socket] connected to server 🎉🎉🎉');
    socket.emit('join game', { game_id: gameId, player_id: playerId });
  });

  socket.on('disconnect', () => {
    console.warn('[Socket] disconnected 🚨🚨🚨');
  });

  socket.on('error', (err) => {
    console.error('[Socket] error ⚠️⚠️⚠️ :', err);
  });

  socket.on(SOCKET_EVENT.JOIN_GAME, (res) => {
    console.log('[Socket] join-game responsed', res);
  });

  const gameClient = new GameClient(socket, playerId);

  socket.on(SOCKET_EVENT.TICTACK_PLAYER, async (res) => {
    // console.log('🎮 Ticktack player:');
    gameClient.onTicktack(res);
  });

  socket.on(SOCKET_EVENT.DRIVE_PLAYER, async (res) => {
    // console.log('🚗 Drive player:');
    gameClient.onDrivePlayer(res);
  });
};
