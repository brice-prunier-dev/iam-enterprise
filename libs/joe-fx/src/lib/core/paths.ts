import { asFunction, asJsObject, isNumber, asArray, isScalar} from './types-helper';
import {asViewElement, MetadataHelper} from './types-info';
import { JsObject, OType} from './types';
import {isBlank, isStringAssigned} from './types-tester';
import {SelectorTypes} from './enums';
import {
    DOUBLEQUOTE,
    KEYVALUEPAIR_SEPARATOR,
    KEYVALUE_SEPARATOR,
    NUMERIC_PREFIX,
    PATH_LOCAL,
    PATH_NEXT,
    PATH_PARENT,
    PATH_ROOT,
    QUOTE
} from './constants';

//
// ─── HREF ───────────────────────────────────────────────────────────────────────
//

/**
 * { key: PathRole, part: any}}
 */
interface SelectorDef {
    text: string;
    type: SelectorTypes;
    value: unknown;
}

/**
 * Encode a  value that is an index selector in a joe paths
 * that method target numeric value to disting value that can either be
 * - an index position of an array : intance>array>[1]
 * from numeric value that can be
 * - an index value of a collection: instance>list>(#18)
 * @param 'Xxx' or 12 or 1.23
 * @returns Xxx or #12 or ##1.23
 */
function _encodeOneSelectorValue(value: string | number): string {
    return isNumber(value)
        ? Number.isInteger(value)
            ? NUMERIC_PREFIX + value
            : NUMERIC_PREFIX + NUMERIC_PREFIX + value
        : (value as string);
}

function _isParenteseClosingOnly(value: string): boolean {
    return isStringAssigned(value) && value.endsWith(')') && !value.startsWith('(');
}

function _isParenteseOpenningOnly(value: string): boolean {
    return isStringAssigned(value) && value.startsWith('(') && !value.endsWith(')');
}

function _pathNeedPrepare(pathParts: SelectorDef[]): boolean {
    const predicate = (p: SelectorDef): boolean =>
        p.type === SelectorTypes.ArrayIndexValues ||
        p.type === SelectorTypes.ArrayIndexObject ||
        p.type === SelectorTypes.ToParent;
    return pathParts.findIndex(predicate) > -1;
}

/**
 * Turn path part into qualified definition { key: enum qualification, part: value }
 * @param part input part definition
 */
function _qualifyPart(part: string): SelectorDef {
    let result: SelectorDef;
    if (part === PATH_ROOT) {
        result = {type: SelectorTypes.Root, value: part, text: part};
    } else if (part === PATH_PARENT) {
        result = {type: SelectorTypes.ToParent, value: part, text: part};
    } else if (part === PATH_LOCAL) {
        result = {type: SelectorTypes.Local, value: part, text: part};
    } else if (isTextArray(part)) {
        result = {
            type: SelectorTypes.ArrayIndexOf,
            value: Number.parseInt(extractContent(part)),
            text: part
        };
    } else if (isIndexSelector(part)) {
        result = {
            type: SelectorTypes.ArrayIndexValues,
            value: decodeIndexValues(part),
            text: part
        };
    } else if (isTextObject(part)) {
        result = {
            type: SelectorTypes.ArrayIndexObject,
            value: decodeKeyValues(part),
            text: part
        };
    } else {
        result = {type: SelectorTypes.Property, value: part, text: part};
    }
    return result;
}

function _resolvePath( from: JsObject, selectorDefs: SelectorDef[]): unknown { 
    let currentElement: JsObject | undefined = from;
    if (_pathNeedPrepare(selectorDefs) && MetadataHelper.isNotPrepared(from)) {
        throw new Error('target should be prepared');
    }
    for (let index = 0; index < selectorDefs.length; index++) {
        if( isBlank(currentElement) ) return undefined;
        const selectorDef = selectorDefs[index];
        switch (selectorDef.type) {
            case SelectorTypes.Property: { 
                const mapGetter: unknown = currentElement['get'];
                const property: unknown = asFunction(mapGetter) 
                    ? mapGetter(selectorDef.value) as JsObject
                    : (currentElement as JsObject)[selectorDef.value as string | number];
                if( asJsObject(property)) {
                   currentElement = property;
                }
                else if( isScalar(property)) {
                    return property;
                }
                break; 
            }

            case SelectorTypes.ArrayIndexOf: { 
                if( asArray(currentElement)) {
                    const item = currentElement[selectorDef.value as number];
                    if( index === selectorDefs.length -1) {
                        return item;
                    }
                    currentElement = item as JsObject;
                } 
                break;
            }
            case SelectorTypes.ToParent: {
                const parentGetter: unknown = (currentElement as JsObject)['get'];
                currentElement = asFunction(parentGetter)
                    ? parentGetter() as JsObject
                    : MetadataHelper.getTypeInfo(currentElement as JsObject)?.parent?.obj as JsObject;
                break;

            }
                

            case SelectorTypes.ArrayIndexValues: {
                 if( asArray(currentElement) && currentElement.length > 0) {
                    const array = currentElement as JsObject[];
                    const selector = selectorDef.value as string;
                    let selectedItem: JsObject | undefined = undefined;
                    if (array.length > 0) {
                        const dataInfo = MetadataHelper.getTypeInfoWithCheck(array[0] as JsObject);
                        if (!dataInfo) {
                            const path = selectorDefs.map((p) => p.value).join(PATH_NEXT);
                            throw new Error(`${path} is not prepared `);
                        }

                        const otype = dataInfo.type as OType;
                        const idObj = otype.buildIndexObjFromSelectorValue(decodeIndexValues(selector));

                        for (const item of array) {
                            if (isMatchingIndexObj(item, idObj)) {
                                selectedItem = item as JsObject;
                                break;
                            }
                        }
                    }
                    currentElement = selectedItem;
                 } else {
                     throw new Error( 'Should be an array: ' + JSON.stringify(currentElement, null, 2) );
                }
                break;
            }
            case SelectorTypes.ArrayIndexObject: {
                if( asArray(currentElement) && currentElement.length > 0) {
                    const array = currentElement as JsObject[];
                    const idObj = selectorDef.value;
                    currentElement = undefined;
                    if (array.length > 0 && idObj) {
                        for (const item of array) {
                            if (isMatchingIndexObj(item, idObj)) {
                                currentElement = item;
                                break;
                            }
                        }
                    }
                } else {
                     throw new Error( 'Should be an array: ' + JSON.stringify(currentElement, null, 2) );
                }
                break;
            }
            case SelectorTypes.Local:
                currentElement = from;
                break;

            case SelectorTypes.Root: {
                const caller = currentElement as JsObject;
                if( asViewElement(caller)) {
                    currentElement = caller.$root();
                } else {
                    currentElement = MetadataHelper.getTypeInfo(caller)?.root().obj as JsObject;
                }
                break;
            }

                

            default:
                break;
        }
        if (currentElement === undefined) {
            return undefined;
        }
    }
    return currentElement;
}

function _write(current: JsObject, segmentPart: SelectorDef, value: unknown): void {
    let currentElement = current;
    switch (segmentPart.type) {
            case SelectorTypes.Property: { 
                const mapSetter: unknown = currentElement['set'];
                if( asFunction(mapSetter) ) {
                    mapSetter(segmentPart.value) 
                } else {
                  (currentElement as JsObject)[segmentPart.value as string | number] = value;
                }
                break; 
            }

            case SelectorTypes.ArrayIndexOf: { 
                if( asArray(currentElement) && currentElement.length > 0) {
                    const item = currentElement[segmentPart.value as number];
                    const obj = item as JsObject;
                    if( asViewElement(obj)) {
                        obj.$assign(value);
                    } else {
                         currentElement[segmentPart.value as number] = value;
                    }
                    currentElement = item as JsObject;
                 } else {
                     throw new Error( 'Should be an array: ' + JSON.stringify(currentElement, null, 2) );
                }
                break;
            }


         case SelectorTypes.ArrayIndexValues: {
                 if( asArray(currentElement) && currentElement.length > 0) {
                    const array = currentElement as JsObject[];
                    const selector = segmentPart.value as string;
                    let selectedItem: JsObject | undefined = undefined;
                    if (array.length > 0) {
                        const dataInfo = MetadataHelper.getTypeInfoWithCheck(array[0] as JsObject);
                       
                        const otype = dataInfo?.type as OType;
                        const idObj = otype.buildIndexObjFromSelectorValue(decodeIndexValues(selector));

                        for (const item of array) {
                            if (isMatchingIndexObj(item, idObj)) {
                                selectedItem = item as JsObject;
                                if( asViewElement(selectedItem)) {
                                    selectedItem.$assign(value);
                                } 
                                break;
                            }
                        }
                    }
                 } else {
                     throw new Error( 'Should be an array: ' + JSON.stringify(currentElement, null, 2) );
                }
                break;
            }
            
        case SelectorTypes.ArrayIndexObject: {
                if( asArray(currentElement) && currentElement.length > 0) {
                    const array = currentElement as JsObject[];
                    const idObj = segmentPart.value;
                    if (array.length > 0 && idObj) {
                        for (const item of array) {
                            if (isMatchingIndexObj(item, idObj)) {
                                if( asViewElement(item)) {
                                    item.$assign(value);
                                }
                                break;
                            }
                        }
                    }
                } else {
                     throw new Error( 'Should be an array: ' + JSON.stringify(currentElement, null, 2) );
                }
                break;
            }
       
    }

    
}

/**
 * Count how many char a string contains
 */
export function countChar(str: string, char: string): number {
    return str.split(char).length - 1;
}

/**
 * Take a selector statement as input and return one or several values that matches the statement
 * @param string as "Xxx" or "Xxx,#12" or "Xxx,##1.23"
 * @returns Xxx or  [Xxx, 12] or [Xxx, 1.23]
 */
export function decodeIndexValues(stringValue: string): string | number | boolean | (string | number | boolean)[] {
    if (isIndexSelector(stringValue)) {
        stringValue = extractContent(stringValue);
    }

    const values = stringValue.split(KEYVALUEPAIR_SEPARATOR).map((s) => decodeOneSelectorValue(s.trim()));
    return values.length === 1 ? values[0] : values;
}

export function decodeKeyValues(pathPart: string): Record<string, string | number| boolean>  {
    if (isTextObject(pathPart)) {
        pathPart = extractContent(pathPart);
    }
    if (isBlank(pathPart)) {
        return {};
    }
    return pathPart
        .split(KEYVALUEPAIR_SEPARATOR)
        .map<[string, string | number | boolean]>((s) => {
            const tmp = s.split(KEYVALUE_SEPARATOR);
            return [tmp[0].trim(), decodeOneSelectorValue(tmp[1].trim())];
        })
        .reduce((r, v) => {
            r[v[0]] = v[1];
            return r;
        }, {} as Record<string, string | number| boolean>);
}

/**
 * take a path value an return its real value
 * @param stringValue string | number  as Xxx or #12 or ##1.23
 * @returns Xxx or 12 or 1.23
 */
export function decodeOneSelectorValue(stringValue: string): string | number | boolean {
    if( stringValue === 'true') {
        return true;
    }
    if( stringValue === 'false') {
        return false;
    }
    return stringValue[0] === NUMERIC_PREFIX
        ? stringValue[1] === NUMERIC_PREFIX
            ? Number.parseFloat(stringValue.substring(2))
            : Number.parseInt(stringValue.substring(1))
        : stringValue;
}

/**
 * Turn an int into a array selector : [N].
 * @param index input value.
 */
export function decodePositionSelector(positionSelector: string): number {
    const postion = extractContent(positionSelector);
    return Number.parseInt(postion);    
}

/**
 * Take one or several selector values as input.s and return a selector statement
 * @param 'Xxx' or 12 or ['Xxx', 1.23]
 * @returns Xxx or #12 or Xxx,##1.23
 */
export function encodeSelector(value: string | number | (string | number)[]): string {
    return Array.isArray(value)
        ? value.map((s) => _encodeOneSelectorValue(s)).join(KEYVALUEPAIR_SEPARATOR)
        : _encodeOneSelectorValue(value);
}

/**
 * Remove surrounding brackets or curly braces.
 * [ text ] or { text } / text
 * @param text input text.
 */
export function extractContent(text: string): string {
    const from = 1;
    const to = text.length - 1;
    return text.substring(from, to).trim();
}

export function getParentProperty(pathStmt: string): string {
    if (pathStmt === undefined) {
        return PATH_ROOT;
    }
    const pathParts: SelectorDef[] = parsePart(pathStmt);
    return pathParts.length > 1 ? pathParts[pathParts.length - 1].value as string : PATH_ROOT;
}

/**
 * Take an object as input and return its string layoutindex values 
 * @param any {p1:"Xxx", p2:5}
 * @returns (Xxx,#5)
 */
export function indexObjAsIndexSelector(value: any): string {
    if (Array.isArray(value)) {
        return wrapAsIndexSelector(
            value.map((s) => _encodeOneSelectorValue(s as string | number))
                .join(KEYVALUEPAIR_SEPARATOR)
        );

    } else if (asJsObject(value)) {
        return wrapAsIndexSelector(
            Object.values(value)
            .map((s) => _encodeOneSelectorValue(s as string | number))
                .join(KEYVALUEPAIR_SEPARATOR)
        );
    } else {
        return wrapAsIndexSelector(_encodeOneSelectorValue(value as string | number));
    }
}

/**
 * Is input string an Index selector: begins and ends with a parenthese.
 * @example
 * (...) 
 * @param text input text.
 */
function isIndexSelector(text: string): boolean {
    return text.startsWith('(') && text.endsWith(')');
}

/**
 * Test an object against arrayselector.
 * @param instance object to test
 * @param selector key definition: {"id":"Xxx""} or {"@>id":"Xxx"}
 */
export function isMatchingIndexObj(instance: JsObject, selector: any): boolean {
    let matching = false;
    for (const key in selector) {
        if (selector.hasOwnProperty(key)) {
            if (key.startsWith(PATH_LOCAL) || key.startsWith(PATH_ROOT)) {
                const val = readPath(instance, key);
                matching = val === selector[key];
            } else if (instance.hasOwnProperty(key)) {
                matching = instance[key] === selector[key];
            }
            if (!matching) {
                return false;
            }
        }
    }
    return matching;
}

/**
 * Test an object against arrayselector.
 * @param instance object to test
 * @param selector key definition: {"id":"Xxx""} or {"@>id":"Xxx"}
 */
export function isMatchingSelector(instance: any, selector: string): boolean {
    const path = MetadataHelper.getTypeInfo(instance)?.path;
    return !isStringAssigned(path)
        ? false
        : path === selector;  
}

export function isPath(path: string): boolean {
    return (
        (path || '').startsWith(PATH_ROOT) ||
        path.startsWith(PATH_NEXT) ||
        path.startsWith(PATH_LOCAL) ||
        path.startsWith(PATH_PARENT)
    );
}

/**
 * Is input string an array parameter: begins and ends with a braket.
 * @example
 * [...] 
 * @param text input text.
 */
export function isTextArray(text: string): boolean {
    return text.startsWith('[') && text.endsWith(']');
}

/**
 * Is it an object parameter: begins and ends with a curly brace.
 * @example
 * {...} 
 * @param text input text.
 */
export function isTextObject(text: string): boolean {
    return isStringAssigned(text) && text.startsWith('{') && text.endsWith('}');
}

/**
 * Is it a valid string parameter ?
 * Should be surround by " or '.
 * @example
 * '...' or "..."
 * @param text input text.
 */
function isTextString(text: string): boolean {
    return isStringAssigned(text)
        ? (text.startsWith(QUOTE) && text.endsWith(QUOTE)) ||
        (text.startsWith(DOUBLEQUOTE) && text.endsWith(DOUBLEQUOTE))
        : false;
}

export function normalizePath(path: string): string {
    return isPath(path)
        ? path.startsWith(PATH_NEXT)
            ? PATH_LOCAL + path
            : path
        : PATH_LOCAL + PATH_NEXT + path;
}

export function parsePart(path: string): SelectorDef[] {
    const parts = splitPath(path);
    const keyparts = parts.map((s) => _qualifyPart(s));
    return keyparts;
}

/**
 * return the path from your parent.
 * 
 * @remark
 * A path is septarated by '>' but if a part starts with '(' 
 * and ends with ')' it is considered as a single part even if it contains '>'.
 * 
 * @example
 * a>b>c>($>e>f)
 * 
 * @remark
 * If you are the root of the hierarchy the return path is an empty string.
 * 
 * @param path of an element
 * @returns path from its parent.
 */
export function pathFromParent(path: string): string {
    const parts = splitPath(path);
    const parentPath = parts[parts.length - 1]! ;
    return parentPath === PATH_ROOT ? '' : parentPath;
}

/**
 * Retrieve an intance or a property in a model hiearchy
 * 
 * A JOE Path is a list of 'part' having '>' as separator
 * @examples '$>property>colection>(id-value)'
 *  
 * The first 'part' of a JOE PAth is either '$' (hierarchy root) or '.' current reference.
 * 
 * A 'part' is by default property name except when :
 * 
 * When a 'part" starts by '(' or '[' it supposed that your navigation along the hierarchy model brought you to an array.
 * 
 * '[2]' means that you whant to retrieve the third item of the array
 * 
 * '(val) means that you whant to retrieve the item of the array having 'val' as index value.
 *  
 * @param current indicates on which element the path is applied 
 * @param docPath path statement
 * @param forgetLast (optional) by setting 1 you retrieve the parent of an json instance 
 * @returns 
 */
export function readPath<T = unknown>(current: JsObject, docPath: string, forgetLast = 0): T | undefined {
    if (!isStringAssigned(docPath) ) {
        return undefined;
    }
    if (current === undefined || !isStringAssigned(docPath) || (asArray<T>(current) && current.length == 0)) {
        return undefined;
    }

    let pathParts: SelectorDef[] = parsePart(docPath);
    if (forgetLast) {
        pathParts = pathParts.slice(0, pathParts.length - forgetLast);
    }
    const result = _resolvePath(current, pathParts);
    return result as T;
}

/**
 * split a path in an array of part.
 * 
 * @remark
 * A path is septarated by '>' but if a part starts with '(' 
 * and ends with ')' it is considered as a single part even if it contains '>'.
 * @param path of an element
 * @returns path from its parent.
 */
export function splitPath(path: string): string[] {
    const pathParts = [];
    let inParentese = false;
    let parenteseCount = 0;
    let currentPart = '';
    const parts = path.split(new RegExp(PATH_NEXT, 'g'));
    for (const part of parts) {
        if( inParentese) {
            if (_isParenteseOpenningOnly(part)) {
                currentPart = part;
                parenteseCount++;
                inParentese = true;
            } else if (_isParenteseClosingOnly(part) ) {
                parenteseCount -= countChar(part, ')');
                inParentese = parenteseCount > 0;
            } else if( isIndexSelector(part)) {
                currentPart += PATH_NEXT + part;
                parenteseCount -= countChar(part, ')')-countChar(part, '(');
                inParentese = parenteseCount > 0;
            }else {
                currentPart += PATH_NEXT + part;
            }
        } else {
            if (_isParenteseOpenningOnly(part)) {
                currentPart = part;
                parenteseCount++;
                inParentese = true;
            } else {
                currentPart = part;
            }
        }
      
         if (!inParentese) {
            pathParts.push( currentPart)
            currentPart = '';
        }
    }
    return pathParts;
}

/**
 * Join part with PATH_NEXT when more then 1.
 * @param source array of string part
 */
export function toPath(source: string[]): string {
    switch (source.length) {
        case 0:
            return PATH_LOCAL;
        case 1:
            return source[0]!;
        default:
            return source[0]!.endsWith(source[1]!) ? source[0]! : source[0]! + PATH_NEXT + source[1]!;
    }
}

/**
 * Turn an int into a array selector : [N].
 * @param index value.s
 */
export function wrapAsIndexSelector(index: string): string {
    if( isBlank(index)) {
        return '';
    }
    return ( index.startsWith('(') && index.endsWith(')')) 
        ? index
        : `(${index})`;
}

/**
 * Turn an int into a array selector : [N].
 * @param index input value.
 */
export function wrapAsPositionSelector(index: number | string): string {
    const stringValue = '' + index;
    return ( stringValue.startsWith('[') && stringValue.endsWith(']')) 
        ? stringValue
        : `[${stringValue}]`;
}

export function writePath(current: JsObject, pathStmt: string, value: unknown) {
    const pathParts: SelectorDef[] = parsePart(pathStmt);
    const lastPart = pathParts[pathParts.length - 1];
    let target = current;
    if( pathParts.length > 1) {
        const toParentParts = pathParts.slice(0, pathParts.length - 1);
        target = _resolvePath(current, toParentParts) as JsObject;
       
    }
    _write(target, lastPart, value);
}
