class STOMPMessageDedupe {
  private handledMessageIds = new Set<string>();
  constructor(private readonly maxSize: number) {}

  public hasHandled(id: string): boolean {
    return this.handledMessageIds.has(id);
  }

  public markHandled(id: string) {
    this.handledMessageIds.add(id);

    if (this.handledMessageIds.size > this.maxSize) {
      const first = this.handledMessageIds.values().next().value!;
      this.handledMessageIds.delete(first);
    }
  }
}

export default STOMPMessageDedupe;
