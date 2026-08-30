import { world, system } from "@minecraft/server";
import { LEVEL_MIN_POWER, VANILLA_BLOCK_LEVELS, VANILLA_TIER_LEVELS } from "../data/mining_power.js";

const LEVEL_TAG = "confluence:level_";
const TOOL_LEVEL_TAG = "confluence:tool_level_";
const CLASS_TAGS = ["pickaxe", "axe", "hammer", "shovel", "hoe"];
const MAX_LEVEL = 9;
const MESSAGE = "confluence.mining.needs_power";

/** @type { (permutation: import("@minecraft/server").BlockPermutation, typeId: string) => number } */
function blockLevel(permutation, typeId) {
	for (let level = MAX_LEVEL; level >= 2; level--) {
		if (permutation.hasTag(LEVEL_TAG + level)) return level;
	}
	return VANILLA_BLOCK_LEVELS[typeId] ?? 0;
}

/** @type { (permutation: import("@minecraft/server").BlockPermutation) => string[] } */
function blockClasses(permutation) {
	const out = [];
	for (const name of CLASS_TAGS) {
		if (permutation.hasTag("confluence:" + name)) out.push(name);
	}
	return out;
}

/** @type { (itemStack: import("@minecraft/server").ItemStack | undefined) => number } */
function toolLevel(itemStack) {
	if (!itemStack) return 0;

	for (let level = MAX_LEVEL; level >= 1; level--) {
		if (itemStack.hasTag(TOOL_LEVEL_TAG + level)) return level;
	}
	for (const tag of Object.keys(VANILLA_TIER_LEVELS)) {
		if (itemStack.hasTag(tag)) return VANILLA_TIER_LEVELS[tag];
	}
	return 0;
}

/** @type { (itemStack: import("@minecraft/server").ItemStack | undefined) => string[] } */
function toolClasses(itemStack) {
	if (!itemStack) return [];

	const out = [];
	if (itemStack.hasTag("minecraft:is_pickaxe")) out.push("pickaxe");
	if (itemStack.hasTag("minecraft:is_axe")) out.push("axe");
	if (itemStack.hasTag("minecraft:is_shovel")) out.push("shovel");
	if (itemStack.hasTag("minecraft:is_hoe")) out.push("hoe");
	if (itemStack.hasTag("confluence:is_hammer")) out.push("hammer");
	return out;
}

/** @type { (player: import("@minecraft/server").Player) => import("@minecraft/server").ItemStack | undefined } */
function heldItem(player) {
	try {
		const container = player.getComponent("minecraft:inventory")?.container;
		if (!container) return undefined;
		return container.getItem(player.selectedSlotIndex ?? player.selectedSlot);
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

/** @type { (permutation: import("@minecraft/server").BlockPermutation, itemStack: import("@minecraft/server").ItemStack | undefined) => boolean } */
function canHarvest(permutation, itemStack) {
	const wanted = blockClasses(permutation);
	if (!wanted.length) return true;

	const held = toolClasses(itemStack);
	for (const name of held) {
		if (wanted.includes(name)) return true;
	}
	return false;
}

/** @type { (player: import("@minecraft/server").Player, block: import("@minecraft/server").Block, itemStack: import("@minecraft/server").ItemStack | undefined) => number } */	
function shortfall(player, block, itemStack) {
	if (isCreative(player)) return 0;

	let permutation;
	try {
		permutation = block.permutation;
	} catch {
		return 0;
	}

	const level = blockLevel(permutation, block.typeId);
	if (level < 2) return 0;
	if (canHarvest(permutation, itemStack) && toolLevel(itemStack) >= level) return 0;
	return level;
}

/** @type { (player: import("@minecraft/server").Player, level: number) => void } */
function tellRequired(player, level) {
	const required = LEVEL_MIN_POWER[level];
	system.run(() => {
		try {
			player.onScreenDisplay.setActionBar({
				translate: MESSAGE,
				with: [String(required)]
			});
		} catch {}
	});
}

// Power Gate
export function registerMiningPower() {
	world.afterEvents.playerStartBreakingBlock.subscribe(event => {
		const { block, player } = event;
		if (!block || !player) return;

		const level = shortfall(player, block, heldItem(player));
		if (level) tellRequired(player, level);
	});

	world.beforeEvents.playerBreakBlock.subscribe(event => {
		const { block, player, itemStack } = event;
		if (!block || !player) return;

		const level = shortfall(player, block, itemStack);
		if (!level) return;

		event.cancel = true;
		tellRequired(player, level);
	});
}
