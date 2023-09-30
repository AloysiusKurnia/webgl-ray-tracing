import { Heap } from "./heap";

const { min, max } = Math;

export interface BB {
    readonly x0: number; readonly y0: number; readonly z0: number;
    readonly x1: number; readonly y1: number; readonly z1: number;
}

function union(a: BB, b: BB): BB {
    return {
        x0: min(a.x0, b.x0),
        y0: min(a.y0, b.y0),
        z0: min(a.z0, b.z0),
        x1: max(a.x1, b.x1),
        y1: max(a.y1, b.y1),
        z1: max(a.z1, b.z1)
    };
}

function hsa(bb: BB) {
    const dx = bb.x1 - bb.x0;
    const dy = bb.y1 - bb.y0;
    const dz = bb.z1 - bb.z0;
    return (dx * dy) + (dy * dz) + (dz * dx);
}

function hsaUnion(a: BB, b: BB) {
    const dx = max(a.x1, b.x1) - min(a.x0, b.x0);
    const dy = max(a.y1, b.y1) - min(a.y0, b.y0);
    const dz = max(a.z1, b.z1) - min(a.z0, b.z0);
    return (dx * dy) + (dy * dz) + (dz * dx);
}

export function bboxDetail(bb: BB) {
    const { x0, x1, y0, y1, z0, z1 } = bb;
    return [x0, y0, z0].map(s => s.toFixed(2)).join('/')
        + '; '
        + [x1, y1, z1].map(s => s.toFixed(2)).join('/')
        + ` (area: ${(2 * hsa(bb)).toFixed(2)})`;
}

const enum Position {
    Left = 'L',
    Right = 'R',
    None = ''
}

export interface BVHTreeNode<T extends BB> extends BB {
    readonly content: [BVHNodeImpl<T>, BVHNodeImpl<T>] | T;
    readonly parent: BVHNodeImpl<T> | null;
    readonly depth: number;
}

class BVHNodeImpl<T extends BB> implements BVHTreeNode<T> {
    x0: number; y0: number; z0: number;
    x1: number; y1: number; z1: number;

    content: [BVHNodeImpl<T>, BVHNodeImpl<T>] | T;
    parent: BVHNodeImpl<T> | null = null;
    hsa: number;
    depth: number;
    positioningInParent = Position.None;
    highestChildIndex = 0 as 0 | 1;
    constructor(content: [BVHNodeImpl<T>, BVHNodeImpl<T>] | T) {
        this.content = content;
        this.recalculateBoundingBox();
    }

    recalculateBoundingBox() {
        let bb: BB;
        if (Array.isArray(this.content)) {
            bb = union(...this.content);
        } else {
            bb = this.content;
        }
        this.x0 = bb.x0; this.x1 = bb.x1;
        this.y0 = bb.y0; this.y1 = bb.y1;
        this.z0 = bb.z0; this.z1 = bb.z1;

        this.hsa = hsa(bb);
    }

    get height(): number {
        let height = 0;
        let node = this as BVHNodeImpl<T>;
        while (node.isBranch()) {
            height += 1;
            node = node.content[node.highestChildIndex];
        }
        return height;
    }

    isBranch(): this is { content: [BVHNodeImpl<T>, BVHNodeImpl<T>]; } {
        return Array.isArray(this.content);
    }

    private recalculateHeight() {
        if (this.isBranch()) {
            const [lh, rh] = this.content.map(s => s.height);
            this.highestChildIndex = (lh > rh) ? 0 : 1;

            return max(lh, rh) + 1;
        }
    }

    private adopt() {
        if (this.isBranch()) {
            this.content.forEach(s => s.parent = this);
        }
    }

    insertSibling(entry: T) {
        const entryNode = new BVHNodeImpl(entry);
        let oldNode: BVHNodeImpl<T>;
        oldNode = new BVHNodeImpl(this.content);
        oldNode.parent = this;
        entryNode.parent = this;
        this.content = [oldNode, entryNode];
        this.highestChildIndex = 0;
        oldNode.positioningInParent = Position.Left;
        entryNode.positioningInParent = Position.Right;

        oldNode.adopt();
        this.recalculateBoundingBox();
        let parent = this.parent;
        while (parent) {
            parent.recalculateHeight();
            parent.recalculateBoundingBox();
            parent.rotate();
            parent = parent.parent;
        }
    }

    rotate() {
        if (!this.isBranch()) {
            return;
        }
        const [l, r] = this.content;
        let bestCostReduction = 0;
        let bestRotation: Rotation | null = null;

        // Find best rotation
        if (r.isBranch()) {
            const [rl, rr] = r.content;
            const areaBefore = r.hsa;

            const costReductionLL = costReductionIfBetter(
                l, rl, rr, areaBefore, bestCostReduction
            );
            if (costReductionLL !== null) {
                bestCostReduction = costReductionLL;
                bestRotation = Rotation.LL;
            }
            const costReductionLR = costReductionIfBetter(
                l, rr, rl, areaBefore, bestCostReduction
            );
            if (costReductionLR !== null) {
                bestCostReduction = costReductionLR;
                bestRotation = Rotation.LR;
            }
        }
        if (l.isBranch()) {
            const [ll, lr] = l.content;
            const areaBefore = l.hsa;

            const costReductionRL = costReductionIfBetter(
                r, ll, lr, areaBefore, bestCostReduction
            );
            if (costReductionRL !== null) {
                bestCostReduction = costReductionRL;
                bestRotation = Rotation.RL;
            }
            const costReductionRR = costReductionIfBetter(
                l, lr, ll, areaBefore, bestCostReduction
            );
            if (costReductionRR !== null) {
                bestCostReduction = costReductionRR;
                bestRotation = Rotation.RR;
            }
        }
        if (bestRotation === null) {
            return;
        }

        // Perform rotation

        type NodePair = [BVHNodeImpl<T>, BVHNodeImpl<T>];
        let nearNode: BVHNodeImpl<T>;
        let swapNode: BVHNodeImpl<T>;

        let oppositeNode: BVHNodeImpl<T>;
        switch (bestRotation) {
            case Rotation.LL: case Rotation.LR:
                nearNode = l;
                oppositeNode = r;
                const [rl, rr] = r.content as NodePair;
                if (bestRotation === Rotation.LL) {
                    swapNode = rl;
                } else {
                    swapNode = rr;
                } break;
            case Rotation.RL: case Rotation.RR:
                nearNode = r;
                oppositeNode = l;
                const [ll, lr] = l.content as NodePair;
                if (bestRotation === Rotation.RL) {
                    swapNode = ll;
                } else {
                    swapNode = lr;
                } break;
        }
        const nearNode_content = nearNode.content;
        nearNode.content = swapNode.content;
        swapNode.content = nearNode_content;

        nearNode.adopt();
        swapNode.adopt();

        swapNode.recalculateHeight();
        nearNode.recalculateHeight();
        oppositeNode.recalculateHeight();
        this.recalculateHeight();

        r.recalculateBoundingBox();
        l.recalculateBoundingBox();

    }

    toString() {
        let node = this as null | BVHNodeImpl<T>;
        let name = '';
        while (node) {
            name = node.positioningInParent + name;
            node = node.parent;
        }
        if (name === '') name = 'Z';
        return `<Node ${name}>`;
    }
}

function costReductionIfBetter<T extends BB>(
    near: BVHNodeImpl<T>,
    swap: BVHNodeImpl<T>,
    rest: BVHNodeImpl<T>,
    nearOppositeCost: number,
    bestCostReduction: number
) {
    const nearOppositeCostAfter = hsaUnion(near, rest);
    const costReduction = nearOppositeCost - nearOppositeCostAfter;
    if (costReduction > bestCostReduction) {
        return costReduction;
    }
    if (costReduction === bestCostReduction) {
        const nearHeight = near.height;
        const swapHeight = swap.height;
        const restHeight = rest.height;
        const heightBefore = max(nearHeight, swapHeight + 1, restHeight + 1);
        const heightAfter = max(swapHeight, nearHeight + 1, restHeight + 1);
        if (heightAfter < heightBefore) {
            return costReduction;
        }
        return null;
    }
    return null;
}

const enum Rotation {
    LL = 'LL',
    LR = 'LR',
    RL = 'RL',
    RR = 'RR'
}

function findBest<T extends BB>(
    root: BVHNodeImpl<T>,
    entry: T,
    heapCache: BVHNodeImpl<T>[]
) {
    type Node = BVHNodeImpl<T>;
    const inheritedCostMemo = new Map<Node, number>();
    function inheritedCost(node: Node | null) {
        if (!node) return 0;

        const memoized = inheritedCostMemo.get(node);
        if (memoized) return memoized;

        const newSurfaceArea = hsaUnion(node, entry);
        const surfaceAreaDifference = newSurfaceArea - node.hsa;
        const value = surfaceAreaDifference + inheritedCost(node.parent);

        inheritedCostMemo.set(node, value);
        return value;
    }
    function cost(node: Node) {
        return hsaUnion(node, entry) + inheritedCost(node.parent);
    }

    let bestNode = root;
    let bestCost = hsaUnion(root, entry);
    let queue = new Heap<Node>((a, b) => cost(a) - cost(b), heapCache);
    queue.push(bestNode);
    while (queue.size > 0) {
        const node = queue.pop()!;
        const nodeCost = cost(node);
        if (nodeCost < bestCost) {
            bestNode = node;
            bestCost = nodeCost;
        }
        if (node.isBranch()) {
            const costLow = hsa(entry) + inheritedCost(node);
            if (costLow < bestCost) {
                const content = node.content;
                queue.push(content[0]);
                queue.push(content[1]);
            }
        }
    }
    return bestNode;
}

export function visualizeTree<T extends BB>(
    node: BVHNodeImpl<T>,
    indent: string = ""
): string {
    let firstIndent = '';
    if (indent.endsWith('  ')) {
        firstIndent = indent.substring(0, indent.length - 2) + '└ ';
    } else if (indent.endsWith('│ ')) {
        firstIndent = indent.substring(0, indent.length - 2) + '├ ';
    }
    if (node.isBranch()) {
        let out = `${firstIndent}${node.height} - ${node} (${bboxDetail(node)})\n`;
        const [l, r] = node.content;
        out += visualizeTree(l, `${indent}│ `);
        out += visualizeTree(r, `${indent}  `);
        return out;
    } else {
        return `${firstIndent}${node.height} - ${node} (${node.content}, ${bboxDetail(node)})\n`;
    }
}

export function buildBVHTree<T extends BB>(boxes: T[]): BVHTreeNode<T> {
    const [first, ...rest] = boxes;

    const root = new BVHNodeImpl(first);
    const heapCache: BVHNodeImpl<T>[] = [];
    for (const entry of rest) {
        const bestPair = findBest(root, entry, heapCache);
        bestPair.insertSibling(entry);
    }
    return root;
}
