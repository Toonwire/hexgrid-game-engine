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

  // from the attacker cells with the most owned neighbor cells, get the one with the weakest neighbor
  const maxOwnedNeighbors = attackerCells[0].neighbors.filter((n) => n.owner === HexOwner.OWN).length;
  const attackersWithMaxOwnedNeighbors = attackerCells.filter(
    (cell) => cell.neighbors.filter((n) => n.owner === HexOwner.OWN).length === maxOwnedNeighbors,
  );

  let weakestTarget = null;
  let attacker = null;
  for (const attackerCell of attackersWithMaxOwnedNeighbors) {
    let potentialTarget = attackerCell.neighbors.sort((n1, n2) => n1.resources - n2.resources)[0];

    if (!weakestTarget || potentialTarget.resources < weakestTarget.resources) {
      weakestTarget = potentialTarget;
      attacker = attackerCell;
    }
  }

  let transferAmount = 1;

  // if the attacker cannot take over the target, transfer half of its resources to the target
  if (weakestTarget.resources > attacker.resources - 1) {
    transferAmount = attacker.resources / 2 > 0 ? attacker.resources / 2 : 1;
  }
  // otherwise, transfer resources from attacker to target so that they end up splitting the resources
  else {
    transferAmount = weakestTarget.resources + (attacker.resources - weakestTarget.resources - 1) / 2;
  }

  return {
    fromId: attacker.id,
    toId: weakestTarget.id,
    transferAmount: Math.round(transferAmount),
  };
}

const name = 'CarefulBot';

export default { name, turn };
