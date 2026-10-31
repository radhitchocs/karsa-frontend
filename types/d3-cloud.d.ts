// Minimal types for d3-cloud@1.2.9 (only the API WordCloud uses).
// @types/d3-cloud is skipped because it drags in the legacy @types/d3@3.
declare module 'd3-cloud' {
  export interface CloudWord {
    text: string;
    size: number;
    x?: number;
    y?: number;
    rotate?: number;
  }

  export interface Cloud<T extends CloudWord> {
    size(size: [number, number]): this;
    words(words: T[]): this;
    padding(padding: number): this;
    rotate(rotate: number | ((d: T, i: number) => number)): this;
    font(font: string | ((d: T, i: number) => string)): this;
    fontWeight(weight: string | number | ((d: T, i: number) => string | number)): this;
    fontSize(size: number | ((d: T, i: number) => number)): this;
    spiral(spiral: 'archimedean' | 'rectangular'): this;
    random(random: () => number): this;
    on(type: 'end', listener: (tags: T[]) => void): this;
    start(): this;
    stop(): this;
  }

  export default function cloud<T extends CloudWord = CloudWord>(): Cloud<T>;
}
