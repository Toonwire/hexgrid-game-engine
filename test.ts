import Hexgrid from './hexgrid';
import { PlayerColors } from './constants';
import Player, { PlayerCell } from './player';
import Game from './game';

import DefaultBot from './algorithms/DefaultBot';
import AggressiveBot from './algorithms/AggressiveBot';
import Transaction from './transaction';

const numPlayers = 1;
const idToPlayers = new Map<string, Player>();

let players: Player[] = [];

for (let i = 0; i < numPlayers; i++) {
  const playerId = `p${i}`;
  // idToPlayers.set(playerId, new Player(playerId, 'player' + i, PlayerColors[i]));
  players.push(new Player('player' + i, PlayerColors[i], AggressiveBot.turn));
}

// const hexgrid = new Hexgrid(Array.from(idToPlayers.values()));
// const hexgrid = new Hexgrid(players);
// console.log(hexgrid.hexagons.find((hex) => hex.ownerId === 'p0'));

// console.log(hexgrid.hexagons.find((hex) => hex.ownerId === 'p0').neighbors[0]);

const game = new Game();

function getPlayerData() {
  var playerData = [];
  players.forEach((player) => {
    const ownedHexagons = game.hexgrid.hexagons.filter((hexagon) => hexagon.ownerId == player.id);

    playerData.push({
      id: player.id,
      name: player.name,
      hexagonCount: ownedHexagons.length,
      resources: ownedHexagons.reduce((acc, hexagon) => acc + hexagon.resources, 0),
      isAlive: player.isAlive(),
      roundsSurvived: player.roundsSurvived,
      exceptions: player.exceptions,
    });
  });
  return playerData;
}

for (const player of players) {
  game.addPlayer(player);
}

game.setup();
console.log(game.hexgrid.hexagons.find((hex) => hex.ownerId === 'p0'));

let playerTransaction = players[0].turn(game.getPlayerCells(players[0].id));
let transaction = Transaction.fromPlayerTransaction(players[0].id, playerTransaction);
players[0].setTransaction(transaction);
console.log(transaction);

game.update();
console.log(game.hexgrid.hexagons.find((hex) => hex.ownerId === 'p0'));

playerTransaction = players[0].turn(game.getPlayerCells(players[0].id));
transaction = Transaction.fromPlayerTransaction(players[0].id, playerTransaction);
players[0].setTransaction(transaction);
console.log(transaction);

game.update();
console.log(game.hexgrid.hexagons.find((hex) => hex.ownerId === 'p0'));

// run with
// npx ts-node test.ts
