import { BlockPermutation, EquipmentSlot, system, world } from "@minecraft/server";
import { DEFAULT_STRIP_SOUND, STRIP_SOUNDS, STRIPPED_INTO } from "../data/stripping.js";

const COMPONENT_ID = "confluence:stripper";
const AXE_TAG = "minecraft:is_axe";
const TOOL_TAG = "confluence:is_tool";
const BREAK_SOUND = "random.break";

/** @type { (player: import("@minecraft/server").Player) => { equippable: import("@minecraft/server").Equippable, stack: import("@minecraft/server").ItemStack } | undefined } */
function heldTool(player) {
	try {
		const equippable = player.getComponent("minecraft:equippable");
		if (!equippable) return undefined;

		const stack = equippable.getEquipment(EquipmentSlot.Mainhand);
		if (!stack) return undefined;
		return { equippable, stack };
	} catch {
		return undefined;
	}
}

/** @type { (player: import("@minecraft/server").Player) => boolean } */
function isCreative(player) {
	try {
		return String(player.getGameMode()).toLowerCase() === "creative";
	} catch {
		return false;
	}
}

/** @type { (stack: import("@minecraft/server").ItemStack, durability: import("@minecraft/server").DurabilityComponent) => boolean } */
function damageIsSpent(stack, durability) {
	let level = 0;
	try {
		level = stack.getComponent("minecraft:enchantable")?.getEnchantment("unbreaking")?.level ?? 0;
	} catch {
		level = 0;
	}
	if (!level) return true;

	const chance = durability.getDamageChance(level);
	return Math.random() * 100 < chance;
}

/** @type { (player: import("@minecraft/server").Player) => void } */
function wearDown(player) {
	if (isCreative(player)) return;

	const held = heldTool(player);
	if (!held?.stack.hasTag(AXE_TAG)) return;

	const { equippable, stack } = held;
	let durability;
	try {
		durability = stack.getComponent("minecraft:durability");
	} catch {
		return;
	}
	if (!durability) return;

	if (!damageIsSpent(stack, durability)) return;

	try {
		if (durability.damage + 1 >= durability.maxDurability) {
			equippable.setEquipment(EquipmentSlot.Mainhand, undefined);
			player.dimension.playSound(BREAK_SOUND, player.location);
			return;
		}
		durability.damage += 1;
		equippable.setEquipment(EquipmentSlot.Mainhand, stack);
	} catch {}
}

/** @type { (block: import("@minecraft/server").Block, intoId: string) => import("@minecraft/server").BlockPermutation | undefined } */
function strippedPermutation(block, intoId) {
	let next;
	try {
		next = BlockPermutation.resolve(intoId);
	} catch {
		return undefined;
	}

	let states = {};
	try {
		states = block.permutation.getAllStates();
	} catch {
		return next;
	}

	for (const [name, value] of Object.entries(states)) {
		try {
			next = next.withState(name, value);
		} catch {}
	}
	return next;
}

// Strip And Sound
/** @type { (player: import("@minecraft/server").Player, block: import("@minecraft/server").Block, sourceId: string, intoId: string) => void } */
function applyStrip(player, block, sourceId, intoId) {
	if (!block.isValid) return;

	if (block.typeId === sourceId) {
		const next = strippedPermutation(block, intoId);
		if (!next) return;

		try {
			block.setPermutation(next);
		} catch {
			return;
		}
		wearDown(player);
	} else if (block.typeId !== intoId) {
		return;
	}

	try {
		block.dimension.playSound(STRIP_SOUNDS[sourceId] ?? DEFAULT_STRIP_SOUND, block.center());
	} catch {}
}

// Swing Animation
/** @type { (itemComponentRegistry: import("@minecraft/server").ItemComponentRegistry) => void } */
export function registerStripper(itemComponentRegistry) {
	itemComponentRegistry.registerCustomComponent(COMPONENT_ID, {
		onUseOn() {}
	});
}

export function registerStrip() {
	world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
		const { block, itemStack, player } = event;
		if (!event.isFirstEvent || !block || !player) return;
		if (!itemStack?.hasTag(AXE_TAG)) return;

		const sourceId = block.typeId;
		const intoId = STRIPPED_INTO[sourceId];
		if (!intoId) return;

		// Vanilla Passthrough
		if (!itemStack.hasTag(TOOL_TAG) && !sourceId.startsWith("confluence:")) return;

		system.run(() => applyStrip(player, block, sourceId, intoId));
	});
}
