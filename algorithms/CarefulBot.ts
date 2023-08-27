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
  // get the cell with at least one unowned neighbor cell and the most owned neighbor cells
  const attackerCells = myCells
    .filter((cell) => cell.neighbors.some((n) => n.owner !== HexOwner.OWN))
    .sort(
      (a, b) =>
        b.neighbors.filter((n) => n.owner === HexOwner.OWN).length -
        a.neighbors.filter((n) => n.owner === HexOwner.OWN).length,
    );
  const attacker = attackerCells[0];

  // target the unowned neighbor with the least resources
  const target = attacker.neighbors
    .filter((n) => n.owner !== HexOwner.OWN)
    .sort((a, b) => a.resources - b.resources)[0];

  // if the attacker cannot take over the target, transfer half of its resources to the target
  if (target.resources > attacker.resources - 1) {
    return {
      fromId: attacker.id,
      toId: target.id,
      transferAmount: attacker.resources / 2 > 0 ? attacker.resources / 2 : 1,
    };
  }
  // otherwise, transfer resources from attacker to target so that they end up splitting the resources
  return {
    fromId: attacker.id,
    toId: target.id,
    transferAmount: target.resources + (attacker.resources - target.resources - 1) / 2,
  };
}

const name = 'CarefulBot';

export default { name, turn };
