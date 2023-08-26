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
  // get all cells with enemy neighbors and sort by resources to get strongest attacker
  const attackerCells = myCells
    .filter((cell) => cell.neighbors.some((n) => n.owner !== HexOwner.OWN))
    .sort((a, b) => b.resources - a.resources);
  const strongestAttacker = attackerCells[0];

  // find and sort neighbors of the most resourceful attacker
  const targetCells = strongestAttacker.neighbors
    .filter((n) => n.owner !== HexOwner.OWN)
    .sort((a, b) => a.resources - b.resources);
  const weakestTarget = targetCells[0];

  // transfer all but one resource from the strongest attacker to the weakest target
  const transaction = {
    fromId: strongestAttacker.id,
    toId: weakestTarget.id,
    transferAmount: strongestAttacker.resources - 1,
  };
  return transaction;
}

const name = 'DefaultBot';

export default { name, turn };
