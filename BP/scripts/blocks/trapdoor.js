const COMPONENT_ID = "confluence:trapdoor";
const OPEN_STATE = "confluence:open";

export function registerTrapdoor(blockComponentRegistry) {
	blockComponentRegistry.registerCustomComponent(COMPONENT_ID, {
		onPlayerInteract(event) {
			const block = event.block;
			if (!block) return;
			if (event.player?.isSneaking) return;

			try {
				const open = block.permutation.getState(OPEN_STATE) === true;
				block.setPermutation(block.permutation.withState(OPEN_STATE, !open));
			} catch {}
		}
	});
}
