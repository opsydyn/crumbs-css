export const calls: {
    argc: number;
    thisValue: unknown;
    args: readonly unknown[];
}[] = [];
export function make(this: unknown, ...args: unknown[]) { calls.push({ argc: arguments.length, thisValue: this, args }); return function suppliedArguments() { return args; }; }
