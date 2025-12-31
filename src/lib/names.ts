const ADJECTIVES = [
	"Neon",
	"Turbo",
	"Flash",
	"Cyber",
	"Pixel",
	"Blaze",
	"Swift",
	"Hyper",
	"Quick",
	"Rapid",
	"Storm",
	"Volt",
	"Nitro",
	"Mega",
	"Ultra",
	"Sonic",
];

const NOUNS = [
	"Ninja",
	"Typist",
	"Runner",
	"Racer",
	"Fox",
	"Wolf",
	"Hawk",
	"Tiger",
	"Wizard",
	"Phantom",
	"Ghost",
	"Shadow",
	"Spark",
	"Bolt",
	"Dash",
	"Blitz",
];

export function generateName(): string {
	const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
	const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
	return `${adj}${noun}`;
}

export function generateId(): string {
	return crypto.randomUUID().slice(0, 8);
}
