import { validateType } from "rutypi";

/*
 * Test for classes passed as argument.
 */
class A {}

validateType<A>(null);
validateType<{
    foo: {
        bar: A
    }
}>(null);