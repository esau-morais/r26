const BELL = "\x07";

export function bell(): void {
	process.stdout.write(BELL);
}

export function doubleBell(): void {
	bell();
	setTimeout(bell, 100);
}

export function tripleBell(): void {
	bell();
	setTimeout(bell, 100);
	setTimeout(bell, 200);
}
