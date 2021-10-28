
interface A<T, K> {
    typeA: "this-is-type-a",
    typeT: T,
    typeK: K
}

type B = {
    typeB: "this is type b";
}

export type Test = {
    typeTString: A<string, number> | string
    /*
    useReferences: A | T2
    propString: "abc" | "c\"de" | 12,
    propNumber: number | string | false,
    propProp: {
        propPropString: string,
        t2Ref: T2,
        aRef: A | string | T2 | B,
        xx: B
    }
    */
};