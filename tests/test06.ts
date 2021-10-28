type A<K, V> = {
    key: K,
    value: A<V, V>
}

export type Test = {
    myMap: A<string, A<number, any>>
}