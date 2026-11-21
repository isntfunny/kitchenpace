/**
 * Seeded spherical k-means for recipe embeddings (cosine similarity).
 * Pure functions: same input order + same seed => same result.
 */

export type Vector = readonly number[];

export function dot(a: Vector, b: Vector): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
    return sum;
}

export function normalize(vector: Vector): number[] {
    let norm = 0;
    for (const value of vector) norm += value * value;
    norm = Math.sqrt(norm);
    if (norm === 0) return vector.map(() => 0);
    return vector.map((value) => value / norm);
}

/** Cosine similarity of two (not necessarily normalized) vectors. */
export function cosineSimilarity(a: Vector, b: Vector): number {
    if (a.length === 0 || a.length !== b.length) return 0;
    return dot(normalize(a), normalize(b));
}

/** Small, fast, seedable PRNG (mulberry32), returns floats in [0, 1). */
export function createRng(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export interface KMeansOptions {
    seed?: number;
    maxIterations?: number;
}

export interface KMeansResult {
    /** Normalized centroids, length = effective k */
    centroids: number[][];
    /** Cluster index per input vector */
    assignments: number[];
    iterations: number;
    converged: boolean;
}

function argmaxSimilarity(vector: Vector, centroids: readonly Vector[]) {
    let best = 0;
    let bestSimilarity = -Infinity;
    for (let c = 0; c < centroids.length; c++) {
        const similarity = dot(vector, centroids[c]);
        if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
            best = c;
        }
    }
    return { best, bestSimilarity };
}

/** k-means++ seeding on cosine distance (1 - similarity). */
function seedCentroids(points: readonly number[][], k: number, rng: () => number): number[][] {
    const centroids: number[][] = [points[Math.floor(rng() * points.length)]];
    const distances = points.map((point) => 1 - dot(point, centroids[0]));

    while (centroids.length < k) {
        let total = 0;
        for (const distance of distances) total += distance * distance;

        let chosen = -1;
        if (total > 0) {
            let target = rng() * total;
            for (let i = 0; i < points.length; i++) {
                target -= distances[i] * distances[i];
                if (target <= 0) {
                    chosen = i;
                    break;
                }
            }
            if (chosen === -1) chosen = points.length - 1;
        } else {
            // All remaining points coincide with a centroid: take any not-yet-used point
            chosen = Math.floor(rng() * points.length);
        }

        centroids.push(points[chosen]);
        for (let i = 0; i < points.length; i++) {
            distances[i] = Math.min(distances[i], 1 - dot(points[i], points[chosen]));
        }
    }

    return centroids.map((centroid) => centroid.slice());
}

export function kmeans(
    vectors: readonly Vector[],
    k: number,
    options: KMeansOptions = {},
): KMeansResult {
    const { seed = 42, maxIterations = 50 } = options;
    const n = vectors.length;
    const effectiveK = Math.max(0, Math.min(Math.floor(k), n));
    if (effectiveK === 0) return { centroids: [], assignments: [], iterations: 0, converged: true };

    const dimension = vectors[0].length;
    if (vectors.some((vector) => vector.length !== dimension)) {
        throw new Error('kmeans: all vectors must have the same dimension');
    }

    const points = vectors.map((vector) => normalize(vector));
    const rng = createRng(seed);
    let centroids = seedCentroids(points, effectiveK, rng);
    const assignments = new Array<number>(n).fill(-1);
    let iterations = 0;
    let converged = false;
    let reseeded = false;

    while (iterations < maxIterations) {
        iterations++;
        let changed = false;
        const similarities = new Array<number>(n);

        for (let i = 0; i < n; i++) {
            const { best, bestSimilarity } = argmaxSimilarity(points[i], centroids);
            similarities[i] = bestSimilarity;
            if (assignments[i] !== best) {
                assignments[i] = best;
                changed = true;
            }
        }

        if (!changed && !reseeded) {
            converged = true;
            break;
        }

        const sums = centroids.map(() => new Array<number>(dimension).fill(0));
        const counts = new Array<number>(effectiveK).fill(0);
        for (let i = 0; i < n; i++) {
            const sum = sums[assignments[i]];
            for (let d = 0; d < dimension; d++) sum[d] += points[i][d];
            counts[assignments[i]]++;
        }

        // Empty clusters are re-seeded with the point that fits its centroid worst
        const taken = new Set<number>();
        centroids = sums.map((sum, c) => {
            if (counts[c] > 0) return normalize(sum);
            let worst = -1;
            for (let i = 0; i < n; i++) {
                if (taken.has(i)) continue;
                if (worst === -1 || similarities[i] < similarities[worst]) worst = i;
            }
            taken.add(worst);
            return points[worst].slice();
        });
        reseeded = taken.size > 0;
    }

    return { centroids, assignments, iterations, converged };
}

/** Rule of thumb for the number of themes: ~sqrt(n / 2), clamped. */
export function suggestClusterCount(n: number, min = 4, max = 24): number {
    if (n <= 0) return 0;
    const suggested = Math.round(Math.sqrt(n / 2));
    return Math.max(1, Math.min(n, Math.max(min, Math.min(max, suggested))));
}
