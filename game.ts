import Hexgrid from './hexgrid';
import Player, { PlayerCell } from './player';
import { HexOwner, PlayerColors } from './constants';
import Transaction from './transaction';
import Hexagon from './hexagon';

export enum GameError {
  UPDATE_GAME_OVER = 'Cannot update game, game is over',
  ADD_PLAYER_BEYOND_MAX = 'Cannot add more players, maximum players reached',
  ADD_PLAYER_ONGOING_GAME = 'Cannot add player to an ongoing game',
  REMOVE_PLAYER_NOT_FOUND = 'Cannot remove player that is not in the game',
  REMOVE_PLAYER_ONGOING_GAME = 'Cannot remove player from an ongoing game',
}

export type GameState = {
  hexagons: Hexagon[];
  players: Map<string, Player>;
};

export type PlayerStats = {
  id: string;
  name: string;
  hexagonCount: number;
  resources: number;
  isAlive: boolean;
  roundsSurvived: number;
  exceptions: number;
};

class Game {
  idToPlayer: Map<string, Player>;
  hexgrid: Hexgrid;

  constructor() {
    this.idToPlayer = new Map<string, Player>();
  }

  /**
   * Sets up the game, creating the hexgrid with the game's players
   */
  setup() {
    this.hexgrid = new Hexgrid(Array.from(this.idToPlayer.values()));
    this._updatePlayerStats();
  }

  addPlayer(player: Player) {
    if (this.hexgrid) throw GameError.ADD_PLAYER_ONGOING_GAME;
    if (this.idToPlayer.size >= PlayerColors.length) throw GameError.ADD_PLAYER_BEYOND_MAX;
    this.idToPlayer.set(player.id, player);
  }

  removePlayer(player: Player) {
    if (this.hexgrid) throw GameError.REMOVE_PLAYER_ONGOING_GAME;
    const removed = this.idToPlayer.delete(player.id);
    if (!removed) throw GameError.REMOVE_PLAYER_NOT_FOUND;
  }

  getCurrentState(): GameState {
    return {
      hexagons: this.hexgrid.hexagons,
      players: this.idToPlayer,
    };
  }

  /**
   * Returns true if all hexagons in the hexgrid have the same owner, otherwise false
   */
  isGameOver(): boolean {
    const firstHexagonOwnerId = this.hexgrid.hexagons[0].ownerId;
    return this.hexgrid.hexagons.every((hexagon) => hexagon.ownerId === firstHexagonOwnerId);
  }

  getWinner(): Player | null {
    if (!this.isGameOver()) {
      return null; // game is not over, so no winner yet
    }

    // if game is over, all hexagons have the same owner, so just return the player who own any hexagon
    return this.idToPlayer.get(this.hexgrid.hexagons[0].ownerId) || null;
  }

  update() {
    if (this.isGameOver()) throw GameError.UPDATE_GAME_OVER;

    // for each player, get their transaction and validate it
    // if valid, add it to the list of valid transactions
    // if invalid, increment the player's exceptions and continue to the next player
    let validPlayerTransactions = [];
    for (const player of this.idToPlayer.values()) {
      if (!player.isAlive()) continue;
      if (!player.transaction) continue;

      try {
        // validate player transaction and add it to the list of valid transactions
        if (player.transaction.isValid(this.hexgrid)) {
          validPlayerTransactions.push(player.transaction);
        }
      } catch (e) {
        console.log(`Player ${player.id} threw invalid transaction exception: ${e}`);
        player.exceptions++;
      }
    }

    Transaction.executeAll(validPlayerTransactions, this.hexgrid);

    this._growPlayerCells();
    this._updatePlayerStats();
  }

  _updatePlayerStats() {
    for (const player of this.idToPlayer.values()) {
      if (!player.isAlive()) continue;
      player.roundsSurvived++;
      player.ownedHexagonCount = this.hexgrid.hexagons.filter((hex) => hex.ownerId === player.id).length;
      player.totalResources = this.hexgrid.hexagons.reduce(
        (acc, hex) => (hex.ownerId === player.id ? acc + hex.resources : acc),
        0,
      );
    }
  }

  _growPlayerCells() {
    this.hexgrid.hexagons.forEach((hexagon) => {
      if (hexagon.isOwned()) {
        hexagon.grow();
      }
    });
  }

  getPlayerCells(playerId: string): PlayerCell[] {
    return this.hexgrid.hexagons
      .filter((hexagon) => hexagon.ownerId === playerId)
      .map((hexagon) => {
        return {
          id: hexagon.id,
          resources: hexagon.resources,
          maxGrowth: hexagon.maxGrowth,
          neighbors: hexagon.neighbors.map((neighborHexagon) => {
            return {
              id: neighborHexagon.id,
              resources: neighborHexagon.resources,
              maxGrowth: neighborHexagon.maxGrowth,
              owner: neighborHexagon.getHexOwnerPerspective(playerId),
            };
          }),
        };
      });
  }

  getPlayerData(): PlayerStats[] {
    var playerData = [];
    for (const player of this.idToPlayer.values()) {
      const ownedHexagons = this.hexgrid.hexagons.filter((hexagon) => hexagon.ownerId == player.id);

      playerData.push({
        id: player.id,
        name: player.name,
        hexagonCount: ownedHexagons.length,
        resources: ownedHexagons.reduce((acc, hexagon) => acc + hexagon.resources, 0),
        isAlive: player.isAlive(),
        roundsSurvived: player.roundsSurvived,
        exceptions: player.exceptions,
      });
    }
    return playerData;
  }
}

export default Game;
