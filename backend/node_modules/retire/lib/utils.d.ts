type LogMethod = (...message: unknown[]) => void;
export declare function info(options: {
    logger?: LogMethod;
}): (...message: unknown[]) => void;
export declare function warn(options: {
    warnlogger?: LogMethod;
    logger?: LogMethod;
}): (...message: unknown[]) => void;
export declare function pick(p: Record<string, unknown>, keys: string[]): Record<(typeof keys)[number], unknown>;
export declare function flatten<T>(e: T[][]): T[];
export {};
