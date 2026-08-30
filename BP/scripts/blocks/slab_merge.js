import { system } from "@minecraft/server";

const COMPONENT_ID = "confluence:slab";
const DOUBLE_STATE = "confluence:double";
const HALF_STATE = "minecraft:vertical_half";

function neighbourForFace(block, face) {
	try {
		if (face === "Up") return block.below();
		if (face === "Down") return block.above();
		if (face === "North") return block.south();
		if (face === "South") return block.north();
		if (face === "East") return block.west();
		if (face === "West") return block.east();
	} catch {
		return undefined;
	}
	return undefined;
}

function canMerge(existing, typeId, face, placingHalf) {
	if (!existing || existing.typeId !== typeId) return false;
	if (existing.permutation.getState(DOUBLE_STATE) === true) return false;

	const half = existing.permutation.getState(HALF_STATE);
	if (face === "Up") return half === "bottom";
	if (face === "Down") return half === "top";
	return placingHalf !== undefined && half !== undefined && placingHalf !== half;
}

// Survival Cost
function consumeHeldSlab(player) {
	if (!player) return;

	let mode;
	try {
		mode = String(player.getGameMode()).toLowerCase();
	} catch {
		return;
	}
	if (mode === "creative") return;

	const container = player.getComponent("minecraft:inventory")?.container;
	if (!container) return;

	const slot = player.selectedSlotIndex ?? player.selectedSlot;
	const stack = container.getItem(slot);
	if (!stack) return;

	if (stack.amount > 1) {
		stack.amount -= 1;
		container.setItem(slot, stack);
	} else {
		container.setItem(slot, undefined);
	}
}

export function registerSlabMerge(blockComponentRegistry) {
	blockComponentRegistry.registerCustomComponent(COMPONENT_ID, {
		beforeOnPlayerPlace(event) {
			const { block, face, permutationToPlace, player } = event;
			const typeId = permutationToPlace.type.id;
			const placingHalf = permutationToPlace.getState(HALF_STATE);

			const existing = neighbourForFace(block, face);
			if (!canMerge(existing, typeId, face, placingHalf)) return;

			event.cancel = true;

			const dimension = existing.dimension;
			const location = existing.location;

			system.run(() => {
				const target = dimension.getBlock(location);
				if (!target || target.typeId !== typeId) return;
				if (target.permutation.getState(DOUBLE_STATE) === true) return;

				target.setPermutation(target.permutation.withState(DOUBLE_STATE, true));
				consumeHeldSlab(player);
			});
		}
	});
}
