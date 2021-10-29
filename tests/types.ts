/* TODO: Default arguments! */
/* TODO: Type mapping -> how does that work within the compiler? */

interface B<K> {
    mainKey: K
}

interface C<K> {
    mainBackupKey: K,
    helloWorld(),
}

interface A<K, V> extends B<K> {
    key: K,
    value: V
}

interface A<K, V> extends C<K> {
    backupKey: K
}

export type Test = {
    somethingNewInHere123123: string
}
/* d d d d */