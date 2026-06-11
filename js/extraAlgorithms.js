import {algorithms} from './lib/algorithms.js';
import {buildRandom} from './lib/random.js';
import {
    METADATA_VISITED, METADATA_CURRENT_CELL, METADATA_UNPROCESSED_CELL,
    SHAPE_SQUARE, SHAPE_TRIANGLE, SHAPE_HEXAGON, SHAPE_CIRCLE
} from './lib/constants.js';

export const ALGORITHM_GROWING_TREE = 'growingTree',
    ALGORITHM_RECURSIVE_DIVISION = 'recursiveDivision';

const extraAlgorithmIds = [ALGORITHM_GROWING_TREE, ALGORITHM_RECURSIVE_DIVISION];

// The maze.js library validates algorithm ids against a hardcoded list, so these
// algorithms can't be passed to buildMaze() directly. Instead the maze is built
// with ALGORITHM_NONE (an empty generator) and attachExtraAlgorithm() replaces
// its runAlgorithm with one driven by the generators defined here.
export function isExtraAlgorithm(algorithmId) {
    return extraAlgorithmIds.includes(algorithmId);
}

export function attachExtraAlgorithm(maze, algorithmId, randomSeed) {
    const random = buildRandom(randomSeed || Date.now()),
        iterator = algorithms[algorithmId].fn(maze, {random});

    maze.runAlgorithm = {
        oneStep() {
            return iterator.next().done && (maze.placeExits() || true);
        },
        toCompletion() {
            while(!iterator.next().done);
            maze.placeExits();
        }
    };
}

function isUnvisited(cell) {
    return !cell.metadata[METADATA_VISITED];
}

function buildProgress(grid, markUnprocessed) {
    let previousCells = [];

    if (markUnprocessed) {
        grid.forEachCell(cell => cell.metadata[METADATA_UNPROCESSED_CELL] = true);
    }

    return {
        step(...cells) {
            previousCells.forEach(previousCell => delete previousCell.metadata[METADATA_CURRENT_CELL]);
            cells.forEach(cell => {
                cell.metadata[METADATA_CURRENT_CELL] = true;
                delete cell.metadata[METADATA_UNPROCESSED_CELL];
            });
            previousCells = cells;
        },
        finished() {
            previousCells.forEach(previousCell => delete previousCell.metadata[METADATA_CURRENT_CELL]);
        }
    };
}

algorithms[ALGORITHM_GROWING_TREE] = {
    metadata: {
        'description': 'Growing Tree',
        'maskable': true,
        'shapes': [SHAPE_SQUARE, SHAPE_TRIANGLE, SHAPE_HEXAGON, SHAPE_CIRCLE]
    },
    fn: function*(grid, config) {
        "use strict";
        const {random} = config,
            progress = buildProgress(grid, true),
            active = [];

        function addToActive(cell) {
            cell.metadata[METADATA_VISITED] = true;
            active.push(cell);
            progress.step(cell);
        }

        addToActive(grid.randomCell());

        while (active.length) {
            // Picking the newest cell behaves like Recursive Backtrack, picking a
            // random one behaves like Simplified Prims; mixing them 50/50 produces
            // mazes with characteristics of both
            const useNewestCell = random.int(2) === 0,
                cell = useNewestCell ? active[active.length - 1] : random.choice(active),
                unvisitedNeighbour = cell.neighbours.random(isUnvisited);

            if (unvisitedNeighbour) {
                grid.link(cell, unvisitedNeighbour);
                addToActive(unvisitedNeighbour);
                yield;
            } else {
                active.splice(active.indexOf(cell), 1);
            }
        }
        progress.finished();
    }
};

algorithms[ALGORITHM_RECURSIVE_DIVISION] = {
    metadata: {
        'description': 'Recursive Division',
        'maskable': false,
        'shapes': [SHAPE_SQUARE]
    },
    fn: function*(grid, config) {
        "use strict";
        // Inverted form of the classic wall-adding algorithm, adapted to a library
        // that only supports carving passages: recursively split each region in two,
        // then link the halves through a single gap. Each split adds exactly one
        // link, so the result is a perfect maze with long straight walls and a
        // room-like structure
        const {random} = config,
            progress = buildProgress(grid, false),
            regions = [{x: 0, y: 0, width: grid.metadata.width, height: grid.metadata.height}];

        while (regions.length) {
            const {x, y, width, height} = regions.pop();

            if (width === 1 && height === 1) {
                continue;
            }

            const divideHorizontally = width === 1 || (height > 1 && (height > width || (height === width && random.int(2) === 0)));

            if (divideHorizontally) {
                const splitAt = 1 + random.int(height - 1),
                    gapX = x + random.int(width),
                    gapY = y + splitAt,
                    cellAbove = grid.getCellByCoordinates(gapX, gapY - 1),
                    cellBelow = grid.getCellByCoordinates(gapX, gapY);

                grid.link(cellAbove, cellBelow);
                progress.step(cellAbove, cellBelow);

                regions.push({x, y, width, height: splitAt});
                regions.push({x, y: gapY, width, height: height - splitAt});
            } else {
                const splitAt = 1 + random.int(width - 1),
                    gapY = y + random.int(height),
                    gapX = x + splitAt,
                    cellLeft = grid.getCellByCoordinates(gapX - 1, gapY),
                    cellRight = grid.getCellByCoordinates(gapX, gapY);

                grid.link(cellLeft, cellRight);
                progress.step(cellLeft, cellRight);

                regions.push({x, y, width: splitAt, height});
                regions.push({x: gapX, y, width: width - splitAt, height});
            }
            yield;
        }
        progress.finished();
    }
};
