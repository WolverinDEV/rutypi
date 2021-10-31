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