export async function defaultDelay(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function noOpDelay(ms: number): Promise<void> {
  void ms;
}
