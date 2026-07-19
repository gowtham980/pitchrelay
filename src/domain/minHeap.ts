/** Binary min-heap priority queue keyed by `dist` (used by Dijkstra). */

export interface HeapItem {
  id: string;
  dist: number;
}

export class MinHeap {
  private data: HeapItem[] = [];

  push(item: HeapItem): void {
    this.data.push(item);
    this.bubbleUp(this.data.length - 1);
  }

  pop(): HeapItem | undefined {
    if (!this.data.length) return undefined;
    const top = this.data[0]!;
    const last = this.data.pop()!;
    if (this.data.length) {
      this.data[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }

  get size(): number {
    return this.data.length;
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      const parent = this.data[p];
      const cur = this.data[i];
      if (!parent || !cur || parent.dist <= cur.dist) break;
      this.data[p] = cur;
      this.data[i] = parent;
      i = p;
    }
  }

  private bubbleDown(i: number): void {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      const cur = this.data[smallest];
      const left = this.data[l];
      const right = this.data[r];
      if (l < n && left && cur && left.dist < cur.dist) smallest = l;
      const smallestItem = this.data[smallest];
      if (r < n && right && smallestItem && right.dist < smallestItem.dist) smallest = r;
      if (smallest === i) break;
      const a = this.data[i];
      const b = this.data[smallest];
      if (!a || !b) break;
      this.data[i] = b;
      this.data[smallest] = a;
      i = smallest;
    }
  }
}
