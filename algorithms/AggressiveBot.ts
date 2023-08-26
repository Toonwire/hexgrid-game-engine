// bot scripts cannot import modules as they will lose the reference when compiled by the server
enum HexOwner {
  NONE,
  OWN,
  OTHER,
}

type NeighborCell = {
  id: string;
  resources: number;
  maxGrowth: number;
  owner: HexOwner;
};

type PlayerCell = {
  id: string;
  resources: number;
  maxGrowth: number;
  neighbors: NeighborCell[];
};

type PlayerTransaction = {
  fromId: string;
  toId: string;
  transferAmount: number;
};

function turn(myCells: PlayerCell[]): PlayerTransaction {
  // get all cells with enemy neighbors
  const attackerCells = myCells.filter((cell) => cell.neighbors.some((n) => n.owner !== HexOwner.OWN));

  var maxRes = 0;
  var attacker = null;
  for (let i = 0; i < attackerCells.length; i++) {
    if (attackerCells[i].resources > maxRes) {
      maxRes = attackerCells[i].resources;
      attacker = attackerCells[i];
    }
  }

  var minRes = 2000;
  var target = null;
  for (let i = 0; i < attacker.neighbors.length; i++) {
    if (attacker.neighbors[i].resources < minRes && attacker.neighbors[i].owner !== HexOwner.OWN) {
      minRes = attacker.neighbors[i].resources;
      target = attacker.neighbors[i];
    }
  }
  var transaction = {
    fromId: attacker.id,
    toId: target.id,
    transferAmount: attacker.resources - 1,
  };
  return transaction;
}

const name = 'AggressiveBot';

export default { name, turn };
