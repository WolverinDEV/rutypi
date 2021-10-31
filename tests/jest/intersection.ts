import {Type, typeInfo} from "rutypi";

test("describe simple intersection", () => {
    expect(typeInfo<number & string>()).toStrictEqual<Type>({
        type: "intersection",
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

test("describe simple intersection with literals", () => {
    expect(typeInfo<123 & "hello!" & undefined>()).toStrictEqual<Type>({
        type: "intersection",
        types: [
            {
                type: "number",
                value: 123
            },
            {
                type: "string",
                value: "hello!"
            },
            {
                type: "undefined",
            }
        ]
    });
});