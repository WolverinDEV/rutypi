/*
 * Test for unions passed as argument.
 */
import { validateType } from "rutypi";

interface A {
    color: string
}

interface B {
    width: number
}

validateType<A | B>(null);
validateType<A | { height: number }>(null);