
export class Heap<T> {
    private currentSize = 0;
    constructor(
        private compare: (a: T, b: T) => number,
        private buffer: T[] = [],
    ) { }

    push(item: T) {
        let itemIndex = this.currentSize;
        this.buffer[itemIndex] = item;
        this.currentSize++;
        while (true) {
            if (itemIndex === 0) return;
            const parentIndex = Math.floor((itemIndex - 1) / 2);
            const parentElement = this.buffer[parentIndex];
            if (this.compare(item, parentElement) > 0) return;

            this.buffer[parentIndex] = item;
            this.buffer[itemIndex] = parentElement;
            itemIndex = parentIndex;
        }
    }

    pop() {
        if (this.currentSize === 0) return undefined;
        const output = this.buffer[0];
        const lastItem = this.buffer.pop()!;
        this.currentSize--;
        const newLength = this.currentSize;
        if (newLength === 0) return output;

        let itemIndex = 0;
        this.buffer[0] = lastItem;
        while (true) {
            const leftIndex = 2 * itemIndex + 1;
            const rightIndex = leftIndex + 1;
            let smallestIndex = itemIndex;
            if (leftIndex < newLength && this.compare(
                this.buffer[leftIndex], this.buffer[smallestIndex]
            ) < 0) smallestIndex = leftIndex;
            if (rightIndex < newLength && this.compare(
                this.buffer[rightIndex],
                this.buffer[smallestIndex]
            ) < 0)
                smallestIndex = rightIndex;

            if (smallestIndex === itemIndex) return output;

            this.buffer[itemIndex] = this.buffer[smallestIndex];
            this.buffer[smallestIndex] = lastItem;

            itemIndex = smallestIndex;
        }
    }

    clear() {
        this.currentSize = 0;
    }

    get size() {
        return this.currentSize;
    }

    get top(): T | undefined {
        return this.buffer[0];
    }
}