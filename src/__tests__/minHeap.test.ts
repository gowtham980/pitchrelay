import { describe, expect, it } from "vitest";
import { MinHeap } from "@/domain/minHeap";

describe("MinHeap", () => {
  it("pops items in ascending dist order", () => {
    const heap = new MinHeap();
    heap.push({ id: "c", dist: 30 });
    heap.push({ id: "a", dist: 5 });
    heap.push({ id: "b", dist: 12 });
    heap.push({ id: "d", dist: 5 });

    expect(heap.size).toBe(4);
    expect(heap.pop()?.dist).toBe(5);
    expect(heap.pop()?.dist).toBe(5);
    expect(heap.pop()).toEqual({ id: "b", dist: 12 });
    expect(heap.pop()).toEqual({ id: "c", dist: 30 });
    expect(heap.pop()).toBeUndefined();
    expect(heap.size).toBe(0);
  });

  it("handles single-element push/pop", () => {
    const heap = new MinHeap();
    heap.push({ id: "only", dist: 1 });
    expect(heap.pop()).toEqual({ id: "only", dist: 1 });
    expect(heap.size).toBe(0);
  });
});
