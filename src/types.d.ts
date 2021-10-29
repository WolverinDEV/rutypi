export interface ValidateOptions {
    noThrow?: boolean;
}
export declare type ValidateResult<T> = {
    status: "success";
    value: T;
} | {
    status: "error";
    errors: string[];
};
