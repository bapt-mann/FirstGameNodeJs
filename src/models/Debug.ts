export class Debug {
    static log(functionFile: string, message: string, color: number): void {
        if (color === 0) {
            console.log(`\x1b[32m[${functionFile}]: ${message}\x1b[0m`); // Vert
        }
        else if (color === 1) {
            console.log(`\x1b[33m[${functionFile}]: ${message}\x1b[0m`); // Jaune
        }
        else if (color === 2) {
            console.log(`\x1b[31m[${functionFile}]: ${message}\x1b[0m`); // Rouge
        }
        else {
        console.log(`[DEBUG]: ${message}`);
        }
    }
}