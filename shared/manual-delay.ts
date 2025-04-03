// Manual delay
export function manualDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
