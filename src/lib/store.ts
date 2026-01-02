import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Player } from "../types";
import { generateId, generateName } from "./names";

const DATA_DIR = join(homedir(), ".r26");
const PLAYER_FILE = join(DATA_DIR, "player.json");

export async function getPlayer(): Promise<Player> {
	try {
		return (await Bun.file(PLAYER_FILE).json()) as Player;
	} catch {
		const player: Player = { id: generateId(), name: generateName() };
		await mkdir(DATA_DIR, { recursive: true });
		await Bun.write(PLAYER_FILE, JSON.stringify(player, null, 2));
		return player;
	}
}

export async function setPlayerName(name: string): Promise<Player> {
	const player = await getPlayer();
	const updated = { ...player, name };
	await Bun.write(PLAYER_FILE, JSON.stringify(updated, null, 2));
	return updated;
}

export async function markFireworksSeen(): Promise<Player> {
	const player = await getPlayer();
	const updated = { ...player, fireworksSeen: true };
	await Bun.write(PLAYER_FILE, JSON.stringify(updated, null, 2));
	return updated;
}
