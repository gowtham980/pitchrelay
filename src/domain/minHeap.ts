/** Binary min-heap priority queue keyed by `dist` (used by Dijkstra). */

export interface HeapItem {
  id: string;
  dist: number;
}

export class MinHeap {
  private data: HeapItem[] = [];

  push(item: HeapItem) {
    this.data.push(item);
    this.bubbleUp(this.data.length - 1);
  }

  pop(): HeapItem | undefined {
    if (!this.data.length) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length) {
      this.data[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }

  get size() {
    return this.data.length;
  }

  private bubbleUp(i: number) {
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.data[p].dist <= this.data[i].dist) break;
      [this.data[p], this.data[i]] = [this.data[i], this.data[p]];
      i = p;
    }
  }

  private bubbleDown(i: number) {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this.data[l].dist < this.data[smallest].dist) smallest = l;
      if (r < n && this.data[r].dist < this.data[smallest].dist) smallest = r;
      if (smallest === i) break;
      [this.data[smallest], this.data[i]] = [this.data[i], this.data[smallest]];
      i = smallest;
    }
  }
}
