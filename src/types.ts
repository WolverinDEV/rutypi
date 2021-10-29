export interface ValidateOptions {
    noThrow?: boolean,
}

export type TypeValidateError = {
    accessStack: string[],
    message: string
}

export type ValidateResult<T> = {
    status: "success",
    value: T
} | {
    status: "error",
    errors: TypeValidateError[]
}

export class ValidateError extends Error {
    private readonly errors: TypeValidateError[];

    constructor(errors: TypeValidateError[]) {
        super("failed to validate object");

        this.errors = errors;
    }

    getErrorMessages() : readonly TypeValidateError[] {
        return this.errors;
    }
}