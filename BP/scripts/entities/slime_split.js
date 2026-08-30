import { world, system } from "@minecraft/server";

const CONFLUENCE_SLIME_TYPES = new Set([
	"confluence:blue_slime",
	"confluence:green_slime",
	"confluence:pink_slime",
	"confluence:purple_slime",
	"confluence:jungle_slime",
	"confluence:ice_slime",
	"confluence:swamp_slime",
	"confluence:tropic_slime",
	"confluence:green_dumpling_slime",
	"confluence:desert_slime",
	"confluence:yellow_slime",
	"confluence:red_slime",
	"confluence:dungeon_slime"
]);
const SPLIT_RADIUS = 2;
const SPLIT_WINDOW_TICKS = 20;

const recentDeaths = [];
const dyingSlimes = new Map();

function trackDeaths() {
	world.afterEvents.entityDie.subscribe(event => {
		const deadEntity = event.deadEntity;
		if (!CONFLUENCE_SLIME_TYPES.has(deadEntity.typeId)) return;

		const death = {
			x: deadEntity.location.x,
			y: deadEntity.location.y,
			z: deadEntity.location.z,
			dimensionId: deadEntity.dimension.id,
			tick: system.currentTick
		};
		recentDeaths.push(death);
		dyingSlimes.set(deadEntity.id, { entity: deadEntity, death });
	});
}

function followDyingSlimes() {
	system.runInterval(() => {
		for (const [id, info] of dyingSlimes) {
			if (!info.entity.isValid) {
				dyingSlimes.delete(id);
				continue;
			}
			const location = info.entity.location;
			info.death.x = location.x;
			info.death.y = location.y;
			info.death.z = location.z;
			info.death.dimensionId = info.entity.dimension.id;
		}
	});
}

function removeVanillaSpawn() {
	world.afterEvents.entitySpawn.subscribe(event => {
		if (event.cause !== "Born") return;

		const entity = event.entity;
		if (entity.typeId !== "minecraft:slime") return;

		const now = system.currentTick;
		const location = entity.location;

		for (let i = recentDeaths.length - 1; i >= 0; i--) {
			const death = recentDeaths[i];
			if (now - death.tick > SPLIT_WINDOW_TICKS) {
				recentDeaths.splice(i, 1);
				continue;
			}
			if (entity.dimension.id !== death.dimensionId) continue;

			const dx = location.x - death.x;
			const dy = location.y - death.y;
			const dz = location.z - death.z;
			if (dx * dx + dy * dy + dz * dz <= SPLIT_RADIUS * SPLIT_RADIUS) {
				entity.remove();
				return;
			}
		}
	});
}

export function registerSlimeSplit() {
	trackDeaths();
	followDyingSlimes();
	removeVanillaSpawn();
}
