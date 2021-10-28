interface B<K> {
    mainKey: K
}

interface C<K> {
    mainBackupKey: K
}

interface A<K, V> extends B<K> {
    key: K,
    value: V
}

interface A<K, V> extends C<K> {
    backupKey: K
}

export type Test = {
    myMap: A<string, A<number, any>>
}