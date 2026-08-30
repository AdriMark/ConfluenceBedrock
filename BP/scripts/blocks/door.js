import { MULTIBLOCK_PARTS, FACING_TURN, PART_STATE } from "../data/multiblock.js";

const COMPONENT_ID = "confluence:door";
const OPEN_STATE = "confluence:open";
const FACING_STATE = "minecraft:cardinal_direction";

/** @type { (block: import("@minecraft/server").Block) => import("@minecraft/server").Block[] } */
function halves(block) {
	const offsets = MULTIBLOCK_PARTS[block.typeId];
	if (!offsets) return [block];

	let part = 0;
	try {
		part = block.permutation.getState(PART_STATE) ?? 0;
	} catch {
		return [block];
	}

	let degrees = 0;
	try {
		degrees = -(FACING_TURN[block.permutation.getState(FACING_STATE)] ?? 0);
	} catch {
		degrees = 0;
	}

	/** @type { (offset: [number, number, number]) => [number, number, number] } */
	const turn = (offset) => {
		const [x, y, z] = offset;
		switch (((degrees % 360) + 360) % 360) {
			case 90: return [-z, y, x];
			case 180: return [-x, y, -z];
			case 270: return [z, y, -x];
			default: return [x, y, z];
		}
	};

	const here = turn(offsets[part]);
	const out = [];
	for (const offset of offsets) {
		const to = turn(offset);
		try {
			const found = block.dimension.getBlock({
				x: block.location.x - here[0] + to[0],
				y: block.location.y - here[1] + to[1],
				z: block.location.z - here[2] + to[2]
			});
			if (found?.typeId === block.typeId) out.push(found);
		} catch {}
	}
	return out.length ? out : [block];
}

// Door Toggle
/** @type { (blockComponentRegistry: import("@minecraft/server").BlockComponentRegistry) => void } */
export function registerDoor(blockComponentRegistry) {
	blockComponentRegistry.registerCustomComponent(COMPONENT_ID, {
		onPlayerInteract(event) {
			const block = event.block;
			if (!block) return;
			if (event.player?.isSneaking) return;

			let open;
			try {
				open = block.permutation.getState(OPEN_STATE) === true;
			} catch {
				return;
			}

			for (const half of halves(block)) {
				try {
					half.setPermutation(half.permutation.withState(OPEN_STATE, !open));
				} catch {}
			}
		}
	});
}
