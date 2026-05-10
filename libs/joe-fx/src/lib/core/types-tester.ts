import { JsObject, Json, JSON_NULL, JsonDoc, JsonObj } from "./types";
import { asString } from "./types-helper";

/**
 * Test that input value is an object without any property.
 * @param value to test 
 * @returns value is assigned.
 */
export function isEmptyArray(value: unknown): boolean {
    return Array.isArray(value) && value.length === 0;
}

/**
 * Test that input value is an object without any property.
 * @param value to test 
 * @returns value is assigned.
 */
export function isEmptyObj(value: JsonObj): boolean {
    return isBlank(value ) 
    || (typeof value === 'object' && Object.keys(value).length === 0);
}


/**
 * Test that input value is assigned: neither undefine or null .
 * @param value to test 
 * @returns value is not null.
 */
export function isAssigned(value: unknown): boolean {
    return !isBlank(value);
}

/**
 * Test that input value is assigned: whatever its type:
 * - either a scalar with a value
 * - or an object with at least an assigned property 
 * - or an array with at least a item.
 * @param value to test 
 * @returns value is assigned.
 */
export function isDataAssigned(value: Json): boolean {
    if (isBlank(value)) {
        return false;
    }
    if (typeof value === 'boolean') {
        return true;
    }
    if (typeof value === 'number' && !isNaN(value.valueOf())) {
        return true;
    }
    if (asString(value) && value.trim().length > 0) {
        return true;
    }
    if (typeof value === 'function' ) {
        return true;
    }
    if ( asJsObject(value) && Object.keys(value).length > 0 ) {
        for (const key in value) {
            if (isDataAssigned(value[key])) {
                return true;
            }
        }
    }
    if (Array.isArray(value) && value.length > 0 ) {
        return true;
    }
    
       
    return false;
}

/**
 * Test that input value is either unassigned or null;
 * @param value to test 
 * @returns value is not assigned.
 */
export function isBlank(value: any): boolean {
    return value === undefined || value === null;
}

/**
 * Test that input value is an object with at least a property.
 * @param value to test 
 * @returns value is an object assigned.
 */
export function isObjAssigned(value: any): boolean {
    return !isBlank(value) && typeof value === 'object' && Object.getOwnPropertyNames(value).length > 0;
}

/**
 * Test that input value is an array with at least an item.
 * @param value to test 
 * @returns value is an array with an item.
 */
export function isArrayAssigned(value: any): boolean {
    return Array.isArray(value) && value.length > 0;
}
/**
 * Test that input value is a string not empty 
 * @param value to test 
 * @returns value is a meaningfull string.
 */
export function isStringAssigned(value: any): boolean {
    return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Test that input value is JOE Type def (aka Schema)
 * @param value to test 
 * @returns value is a Schema
 */
export function isSchema(value: any): boolean {
    const v = value?.type;
    return (
        v !== undefined &&
        v !== null &&
        [
            'object',
            'array',
            'map',
            'string',
            'integer',
            'number',
            'boolean',
            'date',
            'xobject'
        ].includes(v)
    );
}

export function isJoeType(value: any): boolean {
    return isSchema(value) && typeof value.validate === 'function';
}

/**
 * Test that input value a string without value. 
 * @param value to test 
 * @returns value is an empty string.
 */
export function isEmptyString(value: any): boolean {
    return typeof value === 'string' && value.trim().length === 0;
}

/**
 * compare two string values without case sensitivity
 * @param a first string 
 * @param b second string
 * @returns the two strings contains the same value (case insensitive)
 */
export function sameString(a: string | undefined, b: string | undefined): boolean {
    if (a === undefined && b === undefined) {
        return true;
    }
    if ((a === undefined && b !== undefined) || (a !== undefined && b === undefined)) {
        return false;
    }
    return typeof a === 'string' && typeof b === 'string'
        ? a.localeCompare(b, undefined, { sensitivity: 'base' }) === 0
        : a === b;
}
/**
 * Test is a "target" value contains a 'search" value without case sensitivity
 * @param target 
 * @param search 
 * @param searchIsLowerCase optional value to avoid an useless toLowerCase()
 * @returns 
 */
export function containsString(
    target: string | undefined,
    search: string,
    searchIsLowerCase = true
): boolean {
    if (target === undefined) {
        return false;
    }
    const lowerTarget = target.toLowerCase();
    const lowerSearch = searchIsLowerCase ? search : search.toLowerCase();
    return lowerTarget.includes(lowerSearch);
}
/**
 * compare two arrays contains the same list of items.
 * @param a2 first array 
 * @param b2 second array
 * @returns the two array are the same 
 */
export function sameArrays(a1: any[] | undefined, a2: any[] | undefined): boolean {
    if (a1 === undefined && a2 === undefined) {
        return true;
    }
    if (a1 && a2 && a1.length === a2.length) {
        for (let i = 0; i < a1.length; i++) {
            if (a1[i] !== a2[i]) {
                return false;
            }
        }
        return true;
    }
    return false;
}

/**
 * compare two objects properties
 * @param o1 first object 
 * @param o2 second object
 * @returns the two object have the same properties 
 */
export function sameObject(o1: any, o2: any): boolean {
    if (o1 === o2 || (o1 === undefined && o2 === undefined)) {
        return true;
    }
    for (const p in o1) {
        if (o1[p] !== o2[p]) {
            return false;
        }
    }
    for (const p in o2) {
        if (o1[p] !== o2[p]) {
            return false;
        }
    }

    return true;
}
/**
 * Compare two scaler value to sort ascending or descending
 * @param a 
 * @param b 
 * @param isAsc 
 * @returns 0 when equals or 1 when  a > b or -1 when a < b.
 */
export function compare(a: any, b: any, isAsc: boolean): number {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}

/**
 * comparer function for a property on two different object. 
 * @param a first object
 * @param b second object
 * @param sort property to compare (descending when terminated by !)
 * @returns 
 */
export function compareObjProp(a: any, b: any, sort: string): number {
    let propname = sort;
    let isAsc = true;
    if (sort.endsWith('!')) {
        propname = sort.substring(0, sort.length - 1);
        isAsc = false;
    }
    return compare(a[propname], b[propname], isAsc);
}
/**
 * comparer function for a set of properties on two different object. 
 * @param a first object
 * @param b second object
 * @param sort array of property to compare(max 5) (descending when terminated by !)
 * @returns 
 */
export function compareObj(a: any, b: any, sort: string[]): number {
    switch (sort.length) {
        case 1: {
            return compareObjProp(a, b, sort[0]!);
        }
        case 2: {
            const comp1 = compareObjProp(a, b, sort[0]!);
            return comp1 !== 0 ? comp1 : compareObjProp(a, b, sort[1]!);
        }
        case 3: {
            const comp1 = compareObjProp(a, b, sort[0]!);
            const comp2 = compareObjProp(a, b, sort[1]!);
            return comp1 !== 0 ? comp1 : comp2 !== 0 ? comp2 : compareObjProp(a, b, sort[2]!);
        }
        case 4: {
            const comp1 = compareObjProp(a, b, sort[0]!);
            const comp2 = compareObjProp(a, b, sort[1]!);
            const comp3 = compareObjProp(a, b, sort[2]!);
            return comp1 !== 0
                ? comp1
                : comp2 !== 0
                ? comp2
                : comp3 !== 0
                ? comp3
                : compareObjProp(a, b, sort[3]!);
        }
        case 5: {
            const comp1 = compareObjProp(a, b, sort[0]!);
            const comp2 = compareObjProp(a, b, sort[1]!);
            const comp3 = compareObjProp(a, b, sort[2]!);
            const comp4 = compareObjProp(a, b, sort[3]!);
            return comp1 !== 0
                ? comp1
                : comp2 !== 0
                ? comp2
                : comp3 !== 0
                ? comp3
                : comp4 !== 0
                ? comp4
                : compareObjProp(a, b, sort[4]!);
        }
        default:
            throw new Error('Invalid comparaison...');
    }
}
