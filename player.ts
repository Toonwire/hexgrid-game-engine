import { HexOwner, PlayerColor } from './constants';
import { generateGUID } from './guid';
import Transaction, { PlayerTransaction } from './transaction';

type NeighborCell = {
  id: string;
  resources: number;
  maxGrowth: number;
  owner: HexOwner;
};

export type PlayerCell = {
  id: string;
  resources: number;
  maxGrowth: number;
  neighbors: NeighborCell[];
};

class Player {
  id: string;
  name: string;
  color: PlayerColor;
  ownedHexagonCount: number;
  totalResources: number;
  roundsSurvived: number;
  exceptions: number;
  transaction: Transaction | null;
  turn: (myCells: PlayerCell[]) => PlayerTransaction;

  constructor(name: string, color: PlayerColor, turn: (myCells: PlayerCell[]) => PlayerTransaction) {
    this.id = generateGUID();
    this.name = name;
    this.color = color;
    this.ownedHexagonCount = 0;
    this.totalResources = 0;
    this.roundsSurvived = 0;
    this.exceptions = 0;
    this.transaction = null;
    this.turn = turn;
  }

  isAlive() {
    return this.ownedHexagonCount > 0;
  }

  setTransaction(transaction: Transaction) {
    this.transaction = transaction;
  }

  takeTurn(myCells: PlayerCell[]) {
    const playerTransaction = this.turn(myCells);
    const transaction = Transaction.fromPlayerTransaction(this.id, playerTransaction);
    this.setTransaction(transaction);
  }
}

export default Player;
