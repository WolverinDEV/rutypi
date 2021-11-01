import {Type, typeInfo} from "rutypi";

test("describe simple union", () => {
    expect(typeInfo<number | string>()).toStrictEqual<Type>({
        type: "union",
        types: [
            {
                type: "number"
            },
            {
                type: "string"
            }
        ]
    });
});

test("describe simple union with literals", () => {
    expect(typeInfo<123 | "hello!">()).toStrictEqual<Type>({
        type: "union",
        types: [
            {
                type: "number",
                value: 123
            },
            {
                type: "string",
                value: "hello!"
            }
        ]
    });
});

test("describe simple union with literals (without reduction)", () => {
    /* Type info can just be reduced to number | string but we're trying to avoid this at the current stage */
    expect(typeInfo<123 | number | string | "hello!">()).toStrictEqual<Type>({
        type: "union",
        types: [
            {
                type: "number",
                value: 123
            },
            {
                type: "number",
            },
            {
                type: "string",
            },
            {
                type: "string",
                value: "hello!"
            }
        ]
    });
});

/*
type A = {
    failure: true
} | {
    failure: false
} | undefined;
*/

test("describe union with type reference", () => {
    /*
    type A = {
        success: true
    } | {
        success: false
    } | undefined;

    const typeReferenceA = typeInfo<A>();
    if(typeReferenceA.type !== "object-reference") {
        throw "expected a object reference";
    }

    const typeA = lookupReference(typeReferenceA);
    expect(typeA).toStrictEqual<Type>({
        type: "union",
        types: [
            {
                type: "object",
                members: {
                    success: {
                        type: "boolean",
                        value: true
                    }
                }
            },
            {
                type: "object",
                members: {
                    success: {
                        type: "boolean",
                        value: false
                    }
                }
            },
            {
                type: "undefined"
            }
        ],
    });
    */
})