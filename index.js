const express = require('express')
const http = require('http')
const PORT = process.env.PORT || 3000
const socketio = require('socket.io')
const app = express()
const server = http.createServer(app)
const io = socketio(server)

app.use("/", express.static('client')); 

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/client/index.html');
});

app.get('/multiplayer', (req, res) => {
  res.sendFile(__dirname + '/client/multiplayer.html');
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});

const activeGames = []

const getCurrentGame = (socket) => {
  const gameIndex = activeGames.findIndex(game => game.id === socket.room)
  const currentGame = activeGames[gameIndex]
  return currentGame
}

const getSunkIndexes = (arr, val) =>{
  var indexes = [], i;
  for(i = 0; i < arr.length; i++)
      if (arr[i].includes(val))
          indexes.push(i);
  return indexes;
}

const shipSunk = (socket, shootIndex) => {
  const currentGame = getCurrentGame(socket)
  const opponentIndex = currentGame.players.findIndex(player => player.id != socket.id) 
  const shipType = currentGame.boards[opponentIndex][shootIndex].replace('square','').replace('-placed','').replace('taken','').replace('hit','').replace('miss','').replace(/\s/g,'')
  const ship = currentGame.boards[opponentIndex].filter(square => square.includes(shipType))
  if(ship.filter(square => square.includes('hit')).length === ship.length){
    console.log(`${shipType} ship sunk!`)
    //var indexes = []
    for(let i = 0; i < currentGame.boards[opponentIndex].length; i++){
      if (currentGame.boards[opponentIndex][i].includes(shipType)) currentGame.boards[opponentIndex][i] += ' sunk'
      //indexes.push(i);
    }
    //for(let i = 0; i < indexes.length; i++){

    //}
    console.log(currentGame.boards[opponentIndex])
    return shipType
  }else{
    return false
  }
  //if((currentGame.boards[opponentIndex][shootIndex].includes('taken')))
}

const handleTurns = (game, result) => {
  
  if(result != 'hit' && game.gameStarted) game.player1Turn = !game.player1Turn
  const nextPlayer = game.player1Turn ? game.players[0].id : game.players[1].id;
  console.log('nextPlayer', nextPlayer)
  io.to(game.id).emit('next_player', nextPlayer)
}

const checkWin = (game) => {
  const boards = game.boards
  boards.forEach((board, index) => {
    const sunkenSquares = board.filter(square => square.includes('sunk'))
    if(sunkenSquares.length === 14) io.to(game.id).emit('game_over', game.players[index].id)
  });
}

io.on('connection', socket => {
  console.log('new connection')

  
  socket.on('joinRoom', roomCode => {
    console.log(socket.id)
    
    socket.join(roomCode)
    socket.room = roomCode
    if(activeGames.findIndex(game => game.id === roomCode) === -1) activeGames.push({id: roomCode, players: [],player1Turn: true, gameStarted: false, boards: []})
    //console.log(`user joined room ${roomCode}`)
    const gameIndex = activeGames.findIndex(game => game.id === roomCode)
    const currentGame = getCurrentGame(socket)
    //console.log(currentGame)
    currentGame.players.length < 2 ? currentGame.players.push({id: socket.id, ready: false}) : socket.leave(roomCode)
    //const newBoard = 
    console.log('active games', activeGames)
    const playerIndex = currentGame.players.findIndex(player => player.id === socket.id)
    io.to(socket.id).emit('player_assignment', `Player ${playerIndex+1}`) 
    //io.to(socket.room).emit('connected_players', currentGame.players)
    const readyPlayers = currentGame.players.map(player => player.ready)
    io.to(socket.room).emit('players_ready', readyPlayers)
  })

  socket.on('startGame', boardSquares => {
    //console.log(boardSquares)
    const currentGame = getCurrentGame(socket)
    const playerIndex = currentGame.players.findIndex(player => player.id === socket.id)
    
    currentGame.boards[playerIndex] = boardSquares
    currentGame.players[playerIndex].ready = true
    const readyPlayers = currentGame.players.map(player => player.ready)
    console.log('readyplayers', readyPlayers)
    io.to(socket.room).emit('players_ready', readyPlayers)
    console.log(readyPlayers)
    if(readyPlayers.length === 2 && readyPlayers.every(player => player === true)) {
      //io.to(socket.room).emit('game_started', currentGame.players[0].id)
      handleTurns(currentGame, '')
      currentGame.gameStarted = true;
    }
  });

  socket.on('move', shootIndex => {
    console.log('move')
    const currentGame = getCurrentGame(socket)
    const opponentIndex = currentGame.players.findIndex(player => player.id != socket.id) 
    const playerIndex = currentGame.players.findIndex(player => player.id === socket.id) 
    if(playerIndex == currentGame.player1Turn){
      return 
    }
    //console.log(shootIndex, currentGame.boards[opponentIndex][shootIndex])
    let result = ''
    let sunk = ''
    if(currentGame.boards[opponentIndex][shootIndex].includes('taken')){
      result = 'hit'
    }else{
      result = 'miss'
    }
    currentGame.boards[opponentIndex][shootIndex] += ` ${result}`
    console.log('test')
    const sunkenShip = shipSunk(socket, shootIndex)
    const sunkenIndexes = getSunkIndexes(currentGame.boards[opponentIndex], sunkenShip)
    console.log('sunkenIndexes', sunkenIndexes)
    if(sunkenShip) io.to(socket.room).emit('ship_sunk', `Player ${playerIndex+1} sunk Player ${opponentIndex+1}'s ${sunkenShip} ship!`, sunkenIndexes, socket.id)
    io.to(socket.room).emit('result', shootIndex, result, socket.id)
    //if(result != 'hit') currentGame.player1Turn = !currentGame.player1Turn
    checkWin(currentGame)
    handleTurns(currentGame, result)
  })

  socket.on('disconnect', () => {
    const currentGame = getCurrentGame(socket)
    console.log('someone disconnected')
    const gameIndex = activeGames.findIndex(game => game.id === socket.room)
    console.log('disconnectors game', currentGame)
    if(gameIndex === -1) return
    const playerIndex = currentGame.players.indexOf(socket.id)
    const players = currentGame.players
    console.log('players', players)
    currentGame.players.splice(playerIndex, 1);
    console.log('disconnectors game without disconnector', currentGame)
  })

})

