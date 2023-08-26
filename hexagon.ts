import { HexOwner } from './constants';
import Cube from './cube';

function generateGUID(): string {
  var S4 = function () {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
  };
  return S4() + S4() + '-' + S4() + '-' + S4() + '-' + S4() + '-' + S4() + S4() + S4();
}

class Hexagon {
  id: string;
  cube: Cube;
  resources: number;
  ownerId: string | null;
  maxGrowth: number;
  neighbors: Omit<Hexagon, 'neighbors'>[];

  constructor(cube: Cube) {
    this.id = generateGUID();
    this.cube = cube;
    this.resources = 0;
    this.ownerId = null;
    this.maxGrowth = 100;
    this.neighbors = [];
  }

  isOwned(): boolean {
    return this.ownerId !== null;
  }

  /**
   * Grows the resources of this hexagon by 1 if it is not at max growth
   */
  grow(): void {
    if (this.resources < this.maxGrowth) this.resources += 1;
  }

  /**
   * Returns the perspective of the owner of this hexagon from the perspective of the given id
   * @param playerId the id of the player
   * @returns {HexOwner} the perspective of the owner of this hexagon from the perspective of the given id
   */
  getHexOwnerPerspective(playerId: string): HexOwner {
    if (!this.isOwned()) {
      return HexOwner.NONE;
    }

    if (this.ownerId === playerId) {
      return HexOwner.OWN;
    }

    return HexOwner.OTHER;
  }

  makeSuper(): void {
    this.maxGrowth = 300;
  }
}

export default Hexagon;
