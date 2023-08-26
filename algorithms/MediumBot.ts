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

  var bestAttacker = null;
  var bestTarget = null;
  var maxDiff = 1000;
  for (var i = 0; i < attackerCells.length; i++) {
    var attacker = attackerCells[i];
    for (var j = 0; j < attacker.neighbors.length; j++) {
      var target = attacker.neighbors[j];
      if (target.resources - attacker.resources < maxDiff && target.owner !== HexOwner.OWN) {
        maxDiff = target.resources - attacker.resources;
        bestAttacker = attacker;
        bestTarget = target;
      }
    }
  }

  var transaction = {
    fromId: bestAttacker.id,
    toId: bestTarget.id,
    transferAmount: bestAttacker.resources - 1,
  };
  return transaction;
}

const name = 'MediumBot';

export default { name, turn };
