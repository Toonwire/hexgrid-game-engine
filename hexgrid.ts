import { HexOwner, NeighborWraparound } from './constants';
import Cube from './cube';
import Hexagon from './hexagon';
import Player from './player';

function shuffleArray(arr: any[]) {
  let j: number, x: number, i: number;

  for (i = arr.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    x = arr[i];
    arr[i] = arr[j];
    arr[j] = x;
  }
  return arr;
}

function getCubesInGrid(numRings: number) {
  var cubesInGrid = [new Cube(0, 0, 0)];

  for (var r = 0; r < numRings + 1; r++) {
    var x = 0,
      y = -r,
      z = +r;

    for (var i = 0; i < r; i++) {
      x += 1;
      z -= 1;
      cubesInGrid.push(new Cube(x, y, z));
    }
    for (var i = 0; i < r; i++) {
      y += 1;
      z -= 1;
      cubesInGrid.push(new Cube(x, y, z));
    }
    for (var i = 0; i < r; i++) {
      x -= 1;
      y += 1;
      cubesInGrid.push(new Cube(x, y, z));
    }
    for (var i = 0; i < r; i++) {
      x -= 1;
      z += 1;
      cubesInGrid.push(new Cube(x, y, z));
    }
    for (var i = 0; i < r; i++) {
      y -= 1;
      z += 1;
      cubesInGrid.push(new Cube(x, y, z));
    }
    for (var i = 0; i < r; i++) {
      x += 1;
      y -= 1;
      cubesInGrid.push(new Cube(x, y, z));
    }
  }
  return cubesInGrid;
}

/**
 * Creates and returns an array of hexagons, with neighbor associations
 * @param {Number} numRingsInGrid Hexgrid size in terms of number of rings
 * @param {NeighborWraparound} neighborWraparound Whether or not to wrap around the edges of the grid
 * @returns {Map<string, Hexagon>} Map of cube coordinates to hexagons
 */
function _createHexgrid(numRingsInGrid: number, neighborWraparound = NeighborWraparound.WRAP) {
  // create cubes/hexagons of this many rings
  const cubesInGrid = getCubesInGrid(numRingsInGrid);
  const cubeToHex = cubesInGrid.reduce((acc, cube) => ({ ...acc, [cube.toString()]: new Hexagon(cube) }), {});
  const cubeToHexMap = new Map<string, Hexagon>(Object.entries(cubeToHex));

  const mirrorCenter = new Cube(2 * numRingsInGrid + 1, -numRingsInGrid - 1, -numRingsInGrid);
  const mirrorCenters = mirrorCenter.allRotations();

  for (const hexagon of cubeToHexMap.values()) {
    hexagon.cube.neighbors.forEach((neighborCube) => {
      if (neighborWraparound === NeighborWraparound.WRAP) {
        const nearbyMirrorCenter = mirrorCenters.find((centerCube) => centerCube.dist(neighborCube) <= numRingsInGrid);
        if (nearbyMirrorCenter) {
          const mirroredNeighborCube = neighborCube.subtract(nearbyMirrorCenter);
          neighborCube = mirroredNeighborCube;
        }
      }

      const neighborHexagon = cubeToHexMap.get(neighborCube.toString());
      if (neighborHexagon) {
        hexagon.neighbors.push(neighborHexagon);
      }
    });
  }

  return cubeToHexMap;
}

class Hexgrid {
  cubeToHexMap: Map<string, Hexagon>;
  hexagons: Hexagon[];
  hexagonIdMap: Map<string, Hexagon>;

  constructor(players: Player[], neighborWraparound: NeighborWraparound = NeighborWraparound.WRAP) {
    let numRings = 6; // minimum grid size
    let numPlayerRings = 1; // number of rings containing player cells
    let roomForPlayers = 1 + 6 * numPlayerRings; // room for center + the capacity of the ring

    // increase rings by 4 until enough room for all players
    while (roomForPlayers < players.length) {
      numRings += 4; // boundary ring, mining field ring, player ring (+2 mining field cells), other side of mining field ring
      numPlayerRings++; // 4 more rings equate to one more player ring
      roomForPlayers += 6 * numPlayerRings; // each ring of players increase capacity by six of previous ring of player
    }

    this.cubeToHexMap = _createHexgrid(numRings, neighborWraparound);
    this.hexagons = Array.from(this.cubeToHexMap.values());
    const hexagonIdDict = this.hexagons.reduce((acc, hex) => ({ ...acc, [hex.id]: hex }), {});
    this.hexagonIdMap = new Map<string, Hexagon>(Object.entries(hexagonIdDict));

    //// ------------------------------
    //// Assign players to hexagons
    //// ------------------------------

    let playerHexagon = this.cubeToHexMap.get(new Cube(0, 0, 0).toString());

    if (!playerHexagon) throw 'Initial player hexagon not found';

    playerHexagon.resources = 10;
    playerHexagon.ownerId = players[0].id;

    // init mining field ranging from 0-100
    var miningField = Array.from({ length: 6 }, () => Math.floor(Math.random() * 100));

    // make mining field around center hexagon
    playerHexagon.neighbors.forEach((hexNeighbor, index) => {
      // let neighborHex = this.hexagonIdMap.get(hexNeighbor.id)
      // if (!neighborHex) throw 'Neighbor hexagon not found';
      // neighborHex.resources = miningField[index];
      hexNeighbor.resources = miningField[index];
    });

    // make a supercell hexagon beyond each player's mining field (a hexagon diagonal to the player cell)
    const hexToBecomeSuperCell = this.cubeToHexMap.get(playerHexagon.cube.diagonals[0].toString());
    if (!hexToBecomeSuperCell) throw 'Hexagon to make super cell not found';
    hexToBecomeSuperCell.makeSuper();

    // rotations of 15/30 degree increments by doing two 60 degree rotations with different starting point
    var nextPlayerCube = new Cube(4, -4, 0);
    var playersAssigned = 1;

    // assign one hexagon according to restrictions for each other player
    for (let currentPlayerRing = 1; currentPlayerRing <= numPlayerRings; currentPlayerRing++) {
      var playerCubes: Cube[] = [];
      let playerCube = nextPlayerCube;

      // each player ring beyond the first allows for a new player cube offset to rotate 60 degrees around the ring
      // each new offset is 4 hexagons away from the current offset (8 cube unit)
      // each offset beyond the first is effectively curring the degrees of rotation in half
      // e.g. 60 degree rotations with 1 offset  = 60 degrees
      //      60 degree rotations with 2 offsets = 30 degrees
      //      60 degree rotations with 3 offsets = 15 degrees
      for (let numPlayerOffset = currentPlayerRing - 1; numPlayerOffset >= 0; numPlayerOffset--) {
        // extend array - "..." notation fails for large arrays (> 100k entries), we should be okay
        playerCubes.push(...playerCube.allRotations());

        // update player offset after all rotations have been performed with current offset
        playerCube = playerCube.add(new Cube(-4, 0, 4));
      }

      for (let i = 0; i < playerCubes.length && playersAssigned < players.length; i++) {
        let playerHexagon = this.cubeToHexMap.get(playerCubes[i].toString());
        if (!playerHexagon) throw 'Player hexagon not found';

        playerHexagon.resources = 10;
        playerHexagon.ownerId = players[playersAssigned].id;
        playersAssigned++;

        // assign the neighbor hexagons resources equal to the mining field
        // shuffle mining field for each player
        shuffleArray(miningField);

        playerHexagon.neighbors.forEach((hexNeighbor, index) => {
          hexNeighbor.resources = miningField[index];
        });

        // make a supercell hexagon beyond each player's mining field (a hexagon diagonal to the player cell)
        const hexToBecomeSuperCell = this.cubeToHexMap.get(playerHexagon.cube.diagonals[0].toString());
        if (!hexToBecomeSuperCell) throw 'Hexagon to make super cell not found';
        hexToBecomeSuperCell.makeSuper();
      }

      // move player offset to the next player ring
      nextPlayerCube = nextPlayerCube.add(new Cube(4, -4, 0));
    }
  }
}

export default Hexgrid;
