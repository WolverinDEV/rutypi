import {lookupReference, Type, typeInfo} from "rutypi";

type A = {
    key: string,
    value: number,

    optValue?: number
};

test("describe type", () => {
    const typeReferenceA = typeInfo<A>();
    if(typeReferenceA.type !== "type-reference") {
        throw "expected a object reference";
    }

    const typeA = lookupReference(typeReferenceA);
    expect(typeA).toStrictEqual<Type>({
        type: "object",
        members: {
            key: { type: "string" },
            value: { type: "number" },
        },
        optionalMembers: {
            optValue: { type: "number" }
        }
    });
});

type B<K, V> = {
    k: K,
    v: V
};

test("describe type with template parameters", () => {
    const typeReferenceB = typeInfo<B<number, "hello world">>();
    if(typeReferenceB.type !== "type-reference") {
        throw "expected a object reference";
    }
    expect(typeReferenceB.typeArguments).toStrictEqual<Type[]>([
        { type: "number" },
        { type: "string", value: "hello world" }
    ]);

    const typeB = lookupReference(typeReferenceB);
    expect(typeB).toStrictEqual<Type>({
        type: "object",
        members: {
            k: { type: "type-parameter-reference", target: "K" },
            v: { type: "type-parameter-reference", target: "V" },
        },
        typeArgumentNames: [ "K", "V" ]
    });
});

/*
 TODO:
 type C<K> = { key: string } | { altKey: K };
 */

/*
 TODO: Index signature
 type T1 = { [key: string]: number };
 type T2 = { [K in ??]: number };
 */