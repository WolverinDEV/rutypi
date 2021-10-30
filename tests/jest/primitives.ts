import {Type, typeInfo} from "rutypi";

test("describe primitive number", () => {
    expect(typeInfo<number>()).toStrictEqual<Type>({
        type: "number"
    });
});

test("describe primitive number literal", () => {
    expect(typeInfo<123>()).toStrictEqual<Type>({
        type: "number",
        value: 123
    });
});

test("describe primitive string", () => {
    expect(typeInfo<string>()).toStrictEqual<Type>({
        type: "string"
    });
});

test("describe primitive string literal", () => {
    expect(typeInfo<"hello world">()).toStrictEqual<Type>({
        type: "string",
        value: "hello world"
    });
});

test("describe primitive undefined", () => {
    expect(typeInfo<undefined>()).toStrictEqual<Type>({
        type: "undefined"
    });
});

test("describe primitive null", () => {
    expect(typeInfo<null>()).toStrictEqual<Type>({
        type: "null"
    });
});

test("describe primitive any", () => {
    expect(typeInfo<any>()).toStrictEqual<Type>({
        type: "any"
    });
});

test("describe primitive unknown", () => {
    expect(typeInfo<unknown>()).toStrictEqual<Type>({
        type: "unknown"
    });
});

/*
test("describe primitive bigint", () => {
    expect(typeInfo<bigint>()).toStrictEqual<Type>({
        type: "bigint"
    });
});

test("describe primitive bigint literal", () => {
    expect(typeInfo<123b>()).toStrictEqual<Type>({
        type: "bigint",
        value: 123b
    });
});
*/

test("describe primitive array", () => {
    expect(typeInfo<number[]>()).toStrictEqual<Type>({
        type: "array",
        elementType: { type: "number" }
    });

    expect(typeInfo<string[]>()).toStrictEqual<Type>({
        type: "array",
        elementType: { type: "string" }
    });

    expect(typeInfo<123[]>()).toStrictEqual<Type>({
        type: "array",
        elementType: { type: "number", value: 123 }
    });
});

test("describe primitive tuple", () => {
    expect(typeInfo<[number]>()).toStrictEqual<Type>({
        type: "tuple",
        elements: [
            { type: "number" }
        ]
    });

    expect(typeInfo<[number, number?]>()).toStrictEqual<Type>({
        type: "tuple",
        elements: [
            { type: "number" }
        ],
        optionalElements: [
            { type: "number" }
        ],
    });

    expect(typeInfo<[number, number?, ...string[]]>()).toStrictEqual<Type>({
        type: "tuple",
        elements: [
            { type: "number" }
        ],
        optionalElements: [
            { type: "number" }
        ],
        dotdotdotElement: { type: "string" },
    });

    expect(typeInfo<[number, 123?, ...any[]]>()).toStrictEqual<Type>({
        type: "tuple",
        elements: [
            { type: "number" }
        ],
        optionalElements: [
            { type: "number", value: 123 }
        ],
        dotdotdotElement: { type: "any" },
    });
});