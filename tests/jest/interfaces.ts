import {lookupReference, Type, typeInfo} from "rutypi";

interface A {
    color: string
}

interface B {
    key: string
}
interface B {
    value: number
}

test("describe interface", () => {
    const typeReferenceA = typeInfo<A>();
    if(typeReferenceA.type !== "object-reference") {
        throw "expected a object reference";
    }

    const typeA = lookupReference(typeReferenceA);
    expect(typeA).toStrictEqual<Type>({
        type: "object",
        members: {
            color: { type: "string" }
        }
    });
});

test("describe interface with multiple declarations", () => {
    const typeReferenceA = typeInfo<B>();
    if(typeReferenceA.type !== "object-reference") {
        throw "expected a object reference";
    }

    const typeA = lookupReference(typeReferenceA);
    expect(typeA).toStrictEqual<Type>({
        type: "object",
        members: {
            key: { type: "string" },
            value: { type: "number" }
        }
    });
});

/*
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
 */
test.todo("describe interface with inheritance");
test.todo("describe interface with inheritance and multiple declarations");