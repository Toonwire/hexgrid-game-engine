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
  let attacker = null;
  let weakestEnemy = null;
  let minResources = 2000;
  myCells.forEach((cell) => {
    cell.neighbors.forEach((neighbor) => {
      if (neighbor.owner !== HexOwner.OWN && neighbor.resources < minResources) {
        attacker = cell;
        weakestEnemy = neighbor;
        minResources = neighbor.resources;
      }
    });
  });

  var transaction = {
    fromId: attacker.id,
    toId: weakestEnemy.id,
    transferAmount: attacker.resources - 1,
  };
  return transaction;
}

const name = 'EasyBot';

export default { name, turn };
