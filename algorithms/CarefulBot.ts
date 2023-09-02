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
        b.neighbors.filter((n) => n.owner === HexOwner.OWN || (n.owner === HexOwner.NONE && n.resources === 0))
          .length -
        a.neighbors.filter((n) => n.owner === HexOwner.OWN || (n.owner === HexOwner.NONE && n.resources === 0)).length,
    );

  // from the attacker cells with the most owned neighbor cells, get the one with the weakest neighbor
  const maxOwnedNeighbors = attackerCells[0].neighbors.filter((n) => n.owner === HexOwner.OWN).length;
  const attackersWithMaxOwnedNeighbors = attackerCells.filter(
    (cell) => cell.neighbors.filter((n) => n.owner === HexOwner.OWN).length === maxOwnedNeighbors,
  );

  let weakestTarget = null;
  for (const attackerCell of attackersWithMaxOwnedNeighbors) {
    let potentialTarget = attackerCell.neighbors
      .filter((n) => n.owner !== HexOwner.OWN)
      .sort((n1, n2) => n1.resources - n2.resources)[0];

    if (!weakestTarget || potentialTarget.resources < weakestTarget.resources) {
      weakestTarget = potentialTarget;
    }
  }

  // find the attacker with the weakest target as neighbor and has the most resources
  const strongestAttacker = attackersWithMaxOwnedNeighbors
    .filter((cell) => cell.neighbors.some((n) => n.id === weakestTarget.id))
    .sort((a, b) => b.resources - a.resources)[0];

  return {
    fromId: strongestAttacker.id,
    toId: weakestTarget.id,
    transferAmount: strongestAttacker.resources - 1,
  };
}

const name = 'CarefulBot';

export default { name, turn };
