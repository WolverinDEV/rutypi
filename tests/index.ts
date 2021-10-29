/*

validateType<Test>({ value: 12 }) -> returns the object itself and throws.
validateType<Test>({ value: 12 }, { noThrow: true }) -> returns a wrapper around the result.
 */
import {lookupReference, typeInfo, validateType} from "rutypi";
import { Test } from "./types";

/*
typeInfo<{
    value: number | null | undefined
}>();
*/

typeInfo<{
    value: string | undefined,
    optValue?: string
}>();

/*
const result = validateType<Test>({}, { noThrow: false }); //Should be transformed
//result.somethingNewInHere_;

console.error("Type info: %o", typeInfo<Test>());
console.error("Type info: %o", typeInfo<{ value: symbol }>());
*/

type MyType = {
    key: string,
    value: number,
    ref: MyType | undefined | null
};

validateType<MyType>({ key: "a", value: 123, ref: undefined })
let info = typeInfo<MyType>();
if(info.type === "object-reference") {
    console.log("Reference output: %o", lookupReference(info));
}

let x: Test;
//x.somethingNewInHere1;
/*
{
    console.error("Hello World"); // This should not be transformed
}

{
    validateType<{ text: string }>({}); //Should be transformed
}

{
    val.validateType<{ test: number }>({ test: 12 }); //Should be transformed
}

{
    validateTypeRenamed<{ test: number }>({ test: 12 }); //Should be transformed
}

{
    type Test = { test: string, testStruct: number };
    val.validateType<Test>({ test: 12 }); //Should be transformed
}

/*
{
    const val = { validateType: () => {} };
    val.validateType(); // This should not be transformed
}

{
    const validateType = () => {};
    validateType(); // This should not be transformed
}

{
    function validateType() {}
    validateType(); // This should not be transformed
}

{
    function val() {}
    (val as any).validateType(); // This should not be transformed
}
*/

// TODO: Variable override test: Class, Interface, Type, Namespace