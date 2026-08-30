import { STACK_STATE, STACK_LIMIT } from "../data/multiblock.js";

const COMPONENT_ID = "confluence:stackable";

function heapsOn(block) {
	try {
		return block.permutation.getState(STACK_STATE) ?? 1;
	} catch {
		return 1;
	}
}

function heldSlot(player) {
	const container = player?.getComponent("minecraft:inventory")?.container;
	if (!container) return null;

	const slot = player.selectedSlotIndex ?? player.selectedSlot;
	if (slot === undefined) return null;
	return { container, slot };
}

// Survival Cost
function consumeHeldCoin(player) {
	let mode;
	try {
		mode = String(player.getGameMode()).toLowerCase();
	} catch {
		return;
	}
	if (mode === "creative") return;

	const held = heldSlot(player);
	if (!held) return;

	const stack = held.container.getItem(held.slot);
	if (!stack) return;

	if (stack.amount > 1) {
		stack.amount -= 1;
		held.container.setItem(held.slot, stack);
	} else {
		held.container.setItem(held.slot, undefined);
	}
}

export function registerStackable(blockComponentRegistry) {
	blockComponentRegistry.registerCustomComponent(COMPONENT_ID, {
		onPlayerInteract(event) {
			const block = event.block;
			const player = event.player;
			if (!block || !player || player.isSneaking) return;

			const held = heldSlot(player);
			let inHand;
			try {
				inHand = held?.container.getItem(held.slot);
			} catch {
				return;
			}
			if (inHand?.typeId !== block.typeId) return;

			const heaps = heapsOn(block);
			if (heaps >= (STACK_LIMIT[block.typeId] ?? 1)) return;

			try {
				block.setPermutation(block.permutation.withState(STACK_STATE, heaps + 1));
			} catch {
				return;
			}
			consumeHeldCoin(player);
		}
	});
}
