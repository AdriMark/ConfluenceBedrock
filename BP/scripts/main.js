import { system } from "@minecraft/server";
import { registerDoor } from "./blocks/door.js";
import { registerMultiblock, watchMultiblockBreaks } from "./blocks/multiblock.js";
import { registerSlabMerge } from "./blocks/slab_merge.js";
import { registerStackable } from "./blocks/stackable.js";
import { registerStrip, registerStripper } from "./blocks/strip.js";
import { registerTrapdoor } from "./blocks/trapdoor.js";
import { registerSlimeSplit } from "./entities/slime_split.js";
import { registerMiningPower } from "./items/mining_power.js";
import { registerToolLore } from "./items/tool_lore.js";

system.beforeEvents.startup.subscribe((init) => {
	registerDoor(init.blockComponentRegistry);
	registerMultiblock(init.blockComponentRegistry);
	registerSlabMerge(init.blockComponentRegistry);
	registerStackable(init.blockComponentRegistry);
	registerStripper(init.itemComponentRegistry);
	registerTrapdoor(init.blockComponentRegistry);
});

watchMultiblockBreaks();
registerSlimeSplit();
registerStrip();
registerMiningPower();
registerToolLore();
