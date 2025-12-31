import type { Player } from "../types";
import { generateId, generateName } from "./names";

const PLAYER_FILE = "./data/player.json";

export async function getPlayer(): Promise<Player> {
	try {
		return (await Bun.file(PLAYER_FILE).json()) as Player;
	} catch {
		const player: Player = { id: generateId(), name: generateName() };
		await Bun.write(PLAYER_FILE, JSON.stringify(player, null, 2));
		return player;
	}
}

export async function setPlayerName(name: string): Promise<Player> {
	const player = await getPlayer();
	player.name = name;
	await Bun.write(PLAYER_FILE, JSON.stringify(player, null, 2));
	return player;
}
