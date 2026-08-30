import { world } from "@minecraft/server";
import { MULTIBLOCK_PARTS, FACING_TURN, PART_STATE, REPLACEABLE_HERE } from "../data/multiblock.js";

const COMPONENT_ID = "confluence:multiblock";
const AIR = "minecraft:air";

const FACING_STATE = "minecraft:cardinal_direction";

/** @type { (offset: [number, number, number], degrees: number) => [number, number, number] } */
function turnOffset(offset, degrees) {
	const [x, y, z] = offset;
	switch (((degrees % 360) + 360) % 360) {
		case 90: return [-z, y, x];
		case 180: return [-x, y, -z];
		case 270: return [z, y, -x];
		default: return [x, y, z];
	}
}

/** @type { (permutation: import("@minecraft/server").BlockPermutation) => number } */
function facingTurn(permutation) {
	try {
		return -(FACING_TURN[permutation?.getState(FACING_STATE)] ?? 0);
	} catch {
		return 0;
	}
}

/** @type { (origin: import("@minecraft/server").Vector3, offset: [number, number, number], degrees: number) => import("@minecraft/server").Vector3 } */
function partLocation(origin, offset, degrees) {
	const turned = turnOffset(offset, degrees);
	return { x: origin.x + turned[0], y: origin.y + turned[1], z: origin.z + turned[2] };
}

/** @type { (permutation: import("@minecraft/server").BlockPermutation) => number } */
function partIndex(permutation) {
	try {
		return permutation?.getState(PART_STATE) ?? 0;
	} catch {
		return 0;
	}
}

/** @type { (location: import("@minecraft/server").Vector3, typeId: string, permutation: import("@minecraft/server").BlockPermutation) => import("@minecraft/server").Vector3 | null } */
function rootOf(location, typeId, permutation) {
	const offsets = MULTIBLOCK_PARTS[typeId];
	if (!offsets) return null;

	const offset = offsets[partIndex(permutation)];
	if (!offset) return null;
	const turned = turnOffset(offset, facingTurn(permutation));
	return { x: location.x - turned[0], y: location.y - turned[1], z: location.z - turned[2] };
}

const REPLACEABLE = new Set([
	"minecraft:tallgrass", "minecraft:short_grass", "minecraft:double_plant", "minecraft:deadbush",
	"minecraft:fern", "minecraft:large_fern", "minecraft:vine", "minecraft:snow_layer",
	"minecraft:seagrass", "minecraft:kelp", "minecraft:fire", "minecraft:soul_fire",
	"minecraft:light_block", "minecraft:structure_void", "minecraft:hanging_roots",
	"minecraft:yellow_flower", "minecraft:red_flower", "minecraft:sapling", "minecraft:crimson_roots",
	"minecraft:warped_roots", "minecraft:nether_sprouts", "minecraft:glow_lichen", "minecraft:sculk_vein"
]);

/** @type { (dimension: import("@minecraft/server").Dimension, location: import("@minecraft/server").Vector3) => boolean } */
function isClear(dimension, location) {
	try {
		const block = dimension.getBlock(location);
		if (block === undefined) return false;
		if (block.isAir || block.isLiquid) return true;
		if (REPLACEABLE.has(block.typeId)) return true;
		return REPLACEABLE_HERE.has(block.typeId);
	} catch {
		return false;
	}
}

/** @type { (block: import("@minecraft/server").Block) => import("@minecraft/server").Block[] } */
function placeParts(block) {
	/** @type { number[][] } */
	const offsets = MULTIBLOCK_PARTS[block.typeId];
	if (!offsets) return;

	const dimension = block.dimension;
	const origin = block.location;
	const degrees = facingTurn(block.permutation);
	const rest = offsets.slice(1);

	for (const offset of rest) {
		if (!isClear(dimension, partLocation(origin, offset, degrees))) {
			block.setType(AIR);
			return;
		}
	}

	rest.forEach((offset, index) => {
		try {
			const target = dimension.getBlock(partLocation(origin, offset, degrees));
			target?.setPermutation(block.permutation.withState(PART_STATE, index + 1));
		} catch {}
	});
}

const clearing = new Set();

/** @type { (dimension: import("@minecraft/server").Dimension, location: import("@minecraft/server").Vector3, typeId: string, permutation: import("@minecraft/server").BlockPermutation) => void } */
function clearParts(dimension, location, typeId, permutation) {
	/** @type { number[][] } */
	const offsets = MULTIBLOCK_PARTS[typeId];
	if (!offsets) return;

	const origin = rootOf(location, typeId, permutation);
	if (!origin) return;

	const key = typeId + " " + origin.x + " " + origin.y + " " + origin.z;
	if (clearing.has(key)) return;
	clearing.add(key);

	const degrees = facingTurn(permutation);
	try {
		for (const offset of offsets) {
			try {
				const target = dimension.getBlock(partLocation(origin, offset, degrees));
				if (target?.typeId === typeId) target.setType(AIR);
			} catch {}
		}
	} finally {
		clearing.delete(key);
	}
}

/** @type { (blockComponentRegistry: import("@minecraft/server").BlockComponentRegistry) => void } */
export function registerMultiblock(blockComponentRegistry) {
	blockComponentRegistry.registerCustomComponent(COMPONENT_ID, {
		onPlace(event) {
			const block = event.block;
			if (!block) return;
			if (partIndex(block.permutation) !== 0) return;
			placeParts(block);
		},

		onPlayerBreak(event) {
			const permutation = event.brokenBlockPermutation;
			clearParts(event.block.dimension, event.block.location, permutation?.type?.id, permutation);
		}
	});
}

export function watchMultiblockBreaks() {
	world.afterEvents.blockExplode.subscribe(event => {
		const permutation = event.explodedBlockPermutation;
		clearParts(event.dimension, event.block.location, permutation?.type?.id, permutation);
	});
}
