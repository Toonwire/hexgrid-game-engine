import Hexagon from './hexagon';
import Hexgrid from './hexgrid';

export type PlayerTransaction = {
  fromId: string;
  toId: string;
  transferAmount: number;
};

enum TransactionError {
  INVALID_FROM_ID = 'Cannot perform transaction from hexagon with specified id',
  INVALID_TO_ID = 'Cannot perform transaction to hexagon with specified id',
  SAME_HEXAGON = 'Cannot transfer to same hexagon',
  OWNED_HEXAGONS_NOT_CONNECTED = 'No owned path exists from source hexagon to target hexagon',
  NEGATIVE_TRANSFER_AMOUNT = 'Cannot transfer negative amounts',
  NOT_ENOUGH_RESOURCES = 'Not enough resources to transfer',
  UNOWNED_FROM_HEXAGON = 'Source hexagon is not owned by player',
  UNOWNED_TO_HEXAGON_NOT_NEIGHBOR = 'Target hexagon not owned by player is not a neighbor of source hexagon',
  AMOUNT_NOT_INTEGER = 'Transfer amount must be an integer',
}

/**
 * Runs a DFS search for an owned path between the two hexagons.
 * Returns true if such a path exists, otherwise false.
 */
function doesOwnedPathExists(hexagonIdDict: Map<string, Hexagon>, fromHexId: string, toHexId: string) {
  const fromHexagon = hexagonIdDict.get(fromHexId);
  const toHexagon = hexagonIdDict.get(toHexId);

  if (fromHexagon === undefined || toHexagon === undefined) {
    return false;
  }

  const visited = {};
  const stack = [fromHexagon];

  while (stack.length > 0) {
    const currentHexagon = stack.pop()!; // ! is safe because stack.length > 0
    if (currentHexagon.id === toHexagon.id) return true;
    if (currentHexagon.ownerId !== fromHexagon.ownerId) continue;
    visited[currentHexagon.id] = true;
    for (const neighbor of currentHexagon.neighbors) {
      if (!visited[neighbor.id]) {
        stack.push(hexagonIdDict[neighbor.id]);
      }
    }
  }

  return false;
}

class Transaction {
  playerId: string;
  fromHexId: string;
  toHexId: string;
  transferAmount: number;

  constructor(playerId: string, fromHexId: string, toHexId: string, transferAmount: number) {
    this.playerId = playerId;
    this.fromHexId = fromHexId;
    this.toHexId = toHexId;
    this.transferAmount = transferAmount;
  }

  static fromPlayerTransaction(playerId: string, playerTransaction: PlayerTransaction): Transaction {
    return new Transaction(
      playerId,
      playerTransaction.fromId,
      playerTransaction.toId,
      playerTransaction.transferAmount,
    );
  }

  /**
   * Validates a transaction and throws an error if it is invalid.
   * @param {Hexgrid} hexgrid the hexgrid to validate the transaction against
   * @returns {boolean} true if valid, false otherwise
   * @throws {TransactionError} if transaction is invalid
   */
  isValid(hexgrid: Hexgrid): boolean {
    const fromHexagon = hexgrid.hexagonIdMap.get(this.fromHexId);
    const toHexagon = hexgrid.hexagonIdMap.get(this.toHexId);

    if (!fromHexagon) throw TransactionError.INVALID_FROM_ID;
    if (!toHexagon) throw TransactionError.INVALID_TO_ID;
    if (fromHexagon === toHexagon) throw TransactionError.SAME_HEXAGON;
    if (
      fromHexagon.ownerId === toHexagon.ownerId &&
      !doesOwnedPathExists(hexgrid.hexagonIdMap, this.fromHexId, this.toHexId)
    ) {
      throw TransactionError.OWNED_HEXAGONS_NOT_CONNECTED;
    }
    if (this.transferAmount < 0) throw TransactionError.NEGATIVE_TRANSFER_AMOUNT;
    if (fromHexagon.resources < this.transferAmount) throw TransactionError.NOT_ENOUGH_RESOURCES;
    if (fromHexagon.ownerId !== this.playerId) throw TransactionError.UNOWNED_FROM_HEXAGON;
    if (fromHexagon.ownerId !== toHexagon.ownerId && !fromHexagon.neighbors.includes(toHexagon)) {
      throw TransactionError.UNOWNED_TO_HEXAGON_NOT_NEIGHBOR;
    }
    if (!Number.isInteger(this.transferAmount)) throw TransactionError.AMOUNT_NOT_INTEGER;

    return true;
  }

  /**
   * Execute all transactions in the list by
   * first subtracting the transfer amount from the source hexagons.
   * Then create temporary amount stores for each unique toHexId for each player.
   * When all transactions have been processed, check which players have the most
   * resources in their temporary amount stores and give them ownership of the hexagon.
   * @param {Array<Transaction>} transactions list of transactions to execute (assumed to be valid)
   * @param {Hexgrid} hexgrid the hexgrid to execute the transactions on
   * @returns {Hexgrid} the updated hexgrid after all transactions have been executed
   */
  static executeAll(transactions: Array<Transaction>, hexgrid: Hexgrid) {
    // const hexgrid = structuredClone(hexgrid);

    // temporarily store for each player's resources for each target hexagon
    // {"hex1": {"player1": 10, "player2": 5}, "hex2": {"player1": 5, "player2": 10}, ...}
    const targetHexIdToPlayerResources = new Map<string, Map<string, number>>();

    for (const transaction of transactions) {
      const fromHexagon = hexgrid.hexagonIdMap.get(transaction.fromHexId);

      if (!fromHexagon) continue; // throw TransactionError.INVALID_FROM_ID;

      // Subtract transfer amount from source hexagon
      fromHexagon.resources -= transaction.transferAmount;

      // Add record of player transfer amount to target hexagon in temporary store
      let toHexagonPlayerResources = targetHexIdToPlayerResources.get(transaction.toHexId);

      if (!toHexagonPlayerResources) {
        targetHexIdToPlayerResources.set(transaction.toHexId, new Map<string, number>());
        toHexagonPlayerResources = targetHexIdToPlayerResources.get(transaction.toHexId);
      }
      if (!toHexagonPlayerResources!.get(transaction.playerId)) {
        toHexagonPlayerResources!.set(transaction.playerId, 0);
      }
      toHexagonPlayerResources!.set(
        transaction.playerId,
        toHexagonPlayerResources!.get(transaction.playerId)! + transaction.transferAmount,
      );
    }

    // Find the player with the most resources for each target hexagon
    // as well as the second most resources going to the target hexagon
    for (let [targetHexId, playerResourceMap] of targetHexIdToPlayerResources) {
      let maxPlayerId = '';
      let secondMostPlayerResources = 0;
      let maxPlayerResources = 0;
      for (let [playerId, playerResources] of playerResourceMap) {
        // If player has equal or more resources than the current max, update the max and second most
        if (playerResources >= maxPlayerResources) {
          secondMostPlayerResources = maxPlayerResources;
          maxPlayerResources = playerResources;
          maxPlayerId = playerId;
        }
      }

      // assign the player with the most resources to the target hexagon
      // subtracting the second most resources from the player's resources
      const maxPlayerTransferAmount = maxPlayerResources - secondMostPlayerResources;
      const targetHexagon = hexgrid.hexagonIdMap.get(targetHexId);

      // increase resources if already owned
      if (targetHexagon!.ownerId === maxPlayerId) {
        targetHexagon!.resources += maxPlayerTransferAmount;
      }

      // otherwise, use the player's resources to try to take over the hexagon
      else {
        targetHexagon!.resources -= maxPlayerTransferAmount;

        // update owner if enough resources was transferred to overtake hexagon
        if (targetHexagon!.resources < 0) {
          targetHexagon!.ownerId = maxPlayerId;
          targetHexagon!.resources = -targetHexagon!.resources; // convert to positive
        }

        // if no resources left, no one owns the hexagon, so set owner to null
        else if (targetHexagon!.resources === 0) {
          targetHexagon!.ownerId = null;
        }
      }
    }
  }
}

export default Transaction;
