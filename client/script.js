let socket

const joinRoom = () => {
  socket = io();
  const params = new URLSearchParams(location.search);
  const roomCode = params.get('room')
  console.log(roomCode)
  socket.emit("joinRoom", roomCode)
  document.title += ` ${roomCode}`
}
joinRoom();

const userBoard = document.querySelector('#user-board')
const opponentBoard = document.querySelector('#opponent-board')
const rotateButton = document.querySelector('#rotate')
const startGameButton = document.querySelector('#start-game-button')
const ships = document.querySelectorAll('.ship')
const shipSquares = document.querySelectorAll('.ship-square')
const gameInfo = document.querySelector('.game-info')
let isHorizontal = true;
const userBoardSquares = []
const opponentBoardSquares = []

const generateBoardSquares = (board, squareArray, numberOfSquares) => {
  for(let i = 0; i < numberOfSquares; i++){
    const square = document.createElement('div')
    square.setAttribute('data-id', i)
    square.classList.add('square')
    board.appendChild(square)
    squareArray.push(square)
  }
}

generateBoardSquares(userBoard, userBoardSquares, 100)
generateBoardSquares(opponentBoard, opponentBoardSquares, 100)

rotateButton.addEventListener('click', () => {
  ships.forEach(ship => {
    ship.classList.toggle('rotated')
  })
  isHorizontal = !isHorizontal;
})

let currentShip, currentShipType, currentShipLength, currentShipSquare, currentShipFirstSquare, currentShipLastSquare, dropTarget, direction

const dragStart = (e) => {
  console.log(e.target)
  currentShip = e.target
  currentShipLength = currentShip.children.length
  currentShipFirstSquare = currentShip.children[0]
  currentshipLastSquare = currentShip.children[currentShipLength - 1]
  console.log(currentShip, currentShipLength, currentShipSquare)
}

ships.forEach(ship => {ship.addEventListener('dragstart', dragStart)})

ships.forEach(ship => {ship.addEventListener('mousedown', (e) => {
  currentShipSquare = e.target.id
  currentShipType = e.target.id.slice(0, -2)
})})

const dragOver = (e) => {
  e.preventDefault();
}

const placedShips = []

const dragDrop = (e) => {
  e.preventDefault();
  console.log(e.target)
  console.log(currentShip.children)
  console.log(currentShipFirstSquare, currentShipLastSquare)
  dropTarget = e.target
  
  direction = isHorizontal ? 1 : 10
  const targetIndex = parseInt(dropTarget.getAttribute('data-id'))
  //console.log(currentShipSquare)
  dropTarget = (userBoardSquares[targetIndex-parseInt(currentShipSquare.slice(-1))*direction])
  console.log(dropTarget)
  const newShip = {name: currentShipType, squares: []}
  if(isPossibleMove(dropTarget)){
    for(let i = 0; i < currentShipLength; i++){
      userBoardSquares[parseInt(dropTarget.getAttribute('data-id'))+i*direction]?.classList.add('taken', `${currentShipType}-placed`)
      newShip.squares.push(parseInt(dropTarget.getAttribute('data-id'))+i*direction)
    }
    placedShips.push(newShip)
  }
  console.log(placedShips)
}

const isPossibleMove = (targetSquare) => {
  if(targetSquare.classList.contains('taken')) return false
  
  
  const targetIndex = parseInt(targetSquare.getAttribute('data-id'))
  console.log(targetIndex)
  for(let i = 0; i < currentShipLength; i++){
    console.log(userBoardSquares[targetIndex+i*direction])
    if(userBoardSquares[targetIndex+i*direction].classList.contains('taken')) return false
    if((targetIndex+i*direction) % 10 === 0 && i != 0 && isHorizontal) return false
    
    
  }
  currentShip.remove()
  return true

  
}

userBoardSquares.forEach(square => {square.addEventListener('dragover', dragOver)})
userBoardSquares.forEach(square => {square.addEventListener('drop', dragDrop)})



let player1Turn = true;
let gameActive = false;

const startGame = () => {
  const placedShipSquares = userBoardSquares.filter(square => square.classList.contains('taken'))
  console.log(placedShipSquares)
  if(placedShipSquares.length < 14){
    alert('You need to place one of each ship to start the game!')
    return
  }
  const simplifiedBoard = userBoardSquares.map(square => square.getAttribute('class'))
  console.log(simplifiedBoard)
  socket.emit('startGame', simplifiedBoard)
  console.log(userBoardSquares)
  opponentBoardSquares.forEach(square => {square.addEventListener('click', shoot)})
  gameActive = true;
  //gameInfo.textContent = "Your turn"
}

/*const handleTurns = () => {
  player1Turn = !player1Turn;
  gameInfo.textContent = player1Turn ?  "Your turn" : "Opponent's turn"
  !player1Turn && setTimeout(() => {
    handleTurns()
  }, 3000);
}*/

startGameButton.addEventListener('click', startGame)

const checkSunkShips = () => {
  placedShips.forEach(ship => {
    const shipLength = ship.squares.length;
    let shipHits = 0;
    ship.squares.forEach(square => {
      opponentBoardSquares[square].classList.contains('hit') && shipHits++;
    })
    if(shipLength === shipHits){
      ship.squares.forEach(square => {
        opponentBoardSquares[square].classList.add('sunk')
      })

    }
  })
}

const shoot = (e) => {
  if(gameActive && player1Turn){
    console.log(e.target)
    const shootIndex = parseInt(e.target.getAttribute('data-id'))
    //userBoardSquares[shootIndex].classList.contains('taken') ? e.target.classList.add('hit') : e.target.classList.add('miss')
    socket.emit('move', shootIndex)
    //checkSunkShips();
   // handleTurns();
    
  }
}


socket.on('player_assignment', (player) => {
  console.log(player)
})

socket.on('winner', loser => {
  if(loser != socket.id){
    alert('you won!')
  }else{
    alert('opponent won!')
  }
})

socket.on('players_ready', players => {
  console.log(players)
  players.forEach((player, index) => {
    const target = document.querySelector(`.player-${index+1}-status`)
    const indicator = document.querySelectorAll(`.indicator`)
    console.log(indicator)
    target.textContent = player ? `Player ${index+1} is ready` : `Player ${index+1} is not ready`
    if(player){
      indicator[index].classList.add('ready')
      indicator[index].classList.remove('not-ready')
    }else{
      indicator[index].classList.add('not-ready')
      indicator[index].classList.remove('ready')
    }

  })

})

socket.on('game_started', player => {
  console.log(player)
  
})

socket.on('next_player', player => {
  const target = document.querySelector('.game-info')
  let turn
  if(socket.id === player){
    console.log('your turn')
    turn = 'Your turn'
  }else{
    console.log('opponents turn')
    turn = 'Opponents turn'
  }
  target.textContent = turn
})

socket.on('result', (index, result, socketID) => {
  console.log('got result')
  if(socketID === socket.id){
    opponentBoardSquares[index].classList.add(result)
  }else{
    userBoardSquares[index].classList.add(result)
  }
  
})

socket.on('ship_sunk', (status, sunkenIndexes, socketID) => {
  console.log('ship sunk')
  const target = document.querySelector('.latest-status')
  target.textContent = status

  if(socketID === socket.id){
    for(let i = 0; i < sunkenIndexes.length; i++){
      opponentBoardSquares[sunkenIndexes[i]].classList.add('sunk')
    }
    
  }else{
    for(let i = 0; i < sunkenIndexes.length; i++){
      userBoardSquares[sunkenIndexes[i]].classList.add('sunk')
    }
  }
})

