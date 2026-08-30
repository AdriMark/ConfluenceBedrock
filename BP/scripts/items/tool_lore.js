import { world, system } from "@minecraft/server";
import { TOOL_POWER } from "../data/tool_power.js";

const LABEL = { pickaxe: "Pickaxe Power", hammer: "Hammer Power" };
const GRAY = "§7";
const SCAN_INTERVAL = 20;

// Tooltip Line
function loreFor(entry) {
	return GRAY + LABEL[entry.kind] + ": " + entry.power + "%";
}

function stampSlot(container, slot) {
	let stack;
	try {
		stack = container.getItem(slot);
	} catch {
		return;
	}
	if (!stack) return;

	const entry = TOOL_POWER[stack.typeId];
	if (!entry) return;

	const wanted = loreFor(entry);
	let current;
	try {
		current = stack.getLore();
	} catch {
		return;
	}
	if (current.length === 1 && current[0] === wanted) return;

	try {
		stack.setLore([wanted]);
		container.setItem(slot, stack);
	} catch {}
}

function stampInventory(player) {
	const container = player.getComponent("minecraft:inventory")?.container;
	if (!container) return;

	for (let slot = 0; slot < container.size; slot++) stampSlot(container, slot);
}

// Power Tooltip
export function registerToolLore() {
	system.runInterval(() => {
		for (const player of world.getAllPlayers()) {
			try {
				stampInventory(player);
			} catch {}
		}
	}, SCAN_INTERVAL);
}
