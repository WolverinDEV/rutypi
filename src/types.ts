export interface ValidateOptions {
    noThrow?: boolean,
}

export type ValidateResult<T> = {
    status: "success",
    value: T
} | {
    status: "error",
    errors: string[] /* TODO: Work on these! */
}
