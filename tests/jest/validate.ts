import {ValidateError, validateType} from "rutypi";

interface ExpectCallback<T> {
    toThrow() : jest.JestMatchers<T>;
    toReturn() : jest.JestMatchers<T>;
}

const expectCallback = <T>(callback: () => T): ExpectCallback<T> => {
    let result;
    try {
        result = {
            status: "return",
            value: callback()
        };
    } catch (error) {
        result = {
            status: "error",
            error: error
        };
    }

    return {
        toReturn(): jest.JestMatchers<T> {
            if(result.status === "return") {
                return expect(result.value);
            } else {
                if(result.error instanceof ValidateError) {
                    console.info("Validate error: %o", result.error.getErrorMessages());
                }
                throw result.error;
            }
        },
        toThrow(): jest.JestMatchers<T> {
            if(result.status === "error") {
                return expect(result.error);
            } else {
                throw "callable has not thrown an exception";
            }
        }
    }
};

test("validate primitive null", () => {
    expectCallback(() => validateType<null>(null)).toReturn();
    expectCallback(() => validateType<null>(123)).toThrow();
    expectCallback(() => validateType<null>({})).toThrow();
    expectCallback(() => validateType<null>(undefined)).toThrow();
    expectCallback(() => validateType<null>("undefined")).toThrow();
});

test("validate primitive undefined", () => {
    expectCallback(() => validateType<undefined>(undefined)).toReturn();
    expectCallback(() => validateType<undefined>(123)).toThrow();
    expectCallback(() => validateType<undefined>({})).toThrow();
    expectCallback(() => validateType<undefined>(null)).toThrow();
    expectCallback(() => validateType<undefined>("undefined")).toThrow();
});

test("validate primitive any", () => {
    expectCallback(() => validateType<any>(undefined)).toReturn();
    expectCallback(() => validateType<any>(123)).toReturn();
    expectCallback(() => validateType<any>({})).toReturn();
    expectCallback(() => validateType<any>(null)).toReturn();
    expectCallback(() => validateType<any>("undefined")).toReturn();
});

test("validate primitive number", () => {
    expectCallback(() => validateType<number>(123)).toReturn();
    expectCallback(() => validateType<number>("123")).toThrow();
    expectCallback(() => validateType<number>({})).toThrow();
    expectCallback(() => validateType<number>(undefined)).toThrow();
    expectCallback(() => validateType<number>(null)).toThrow();

    expectCallback(() => validateType<123>(123)).toReturn();
    expectCallback(() => validateType<123>(234)).toThrow();
});

/*
BigInt isn't available when going to es6
test("validate primitive bigint", () => {
    expect(() => validateType<bigint>(123n)).toReturn();
    expect(() => validateType<bigint>("123")).toThrow();

    expect(() => validateType<123n>(123n)).toReturn();
    expect(() => validateType<123n>(234n)).toThrow();
});
*/

test("validate primitive string", () => {
    expectCallback(() => validateType<string>("123")).toReturn();
    expectCallback(() => validateType<string>(123)).toThrow();
    expectCallback(() => validateType<string>({})).toThrow();
    expectCallback(() => validateType<string>(undefined)).toThrow();
    expectCallback(() => validateType<string>(null)).toThrow();

    expectCallback(() => validateType<"123">("123")).toReturn();
    expectCallback(() => validateType<"123">("234")).toThrow();
    expectCallback(() => validateType<"123">(null)).toThrow();
});

test("validate type simple", () => {
    type T = {
        key: string,
        value?: number
    };

    expectCallback(() => validateType<T>("123")).toThrow();
    expectCallback(() => validateType<T>(123)).toThrow();
    expectCallback(() => validateType<T>({})).toThrow();
    expectCallback(() => validateType<T>(undefined)).toThrow();
    expectCallback(() => validateType<T>(null)).toThrow();
    expectCallback(() => validateType<T>({ key: 123 })).toThrow();
    expectCallback(() => validateType<T>({ key: "123" })).toReturn().toStrictEqual({ key: "123" });
    expectCallback(() => validateType<T>({ key: "123", value: 123 })).toReturn().toStrictEqual({ key: "123", value: 123 });
    expectCallback(() => validateType<T>({ key: "123", value: "123" })).toThrow();
    expectCallback(() => validateType<T>({ key: "123", value: undefined })).toThrow();
});