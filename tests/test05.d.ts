interface A<T, K> {
    typeA: "this-is-type-a";
    typeT: T;
    typeK: K;
}
export declare type Test = {
    typeTString: A<string, number> | string;
};
export {};
