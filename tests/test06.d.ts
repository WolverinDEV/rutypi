declare type A<K, V> = {
    key: K;
    value: A<V, V>;
};
export declare type Test = {
    myMap: A<string, A<number, any>>;
};
export {};
