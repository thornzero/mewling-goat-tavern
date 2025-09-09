declare module "astro:actions" {
	type Actions = typeof import("/home/thornzero/Repositories/mewling-goat-tavern/backend/src/frontend/src/actions/index.ts")["server"];

	export const actions: Actions;
}