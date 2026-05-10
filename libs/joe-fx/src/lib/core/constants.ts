
/**
 * Value assigned to a new child element as temporary path.
 * 
 * A ViewElement having __PATH_UNASSIGNED__ as _path_ means it is not
 *  part of the document hierarchy. 
 * 
 * A new child element has its _path_ updated from its initial __PATH_UNASSIGNED__ 
 * value only when it is added to the document view hierarchy. 
 */
export const PATH_UNASSIGNED = '_?_';
/**
 * Sympbol used by __JOE's__ Json pointer  (at the start) to specify we need 
 * to use the curren reference as the stating point of the `Path Pointer`.
 */
export const PATH_ROOT = '$';
/**
 * Sympbol used by __JOE's__ Json pointer  (at the start) to specify we need 
 * to jump up to the root element of the curren reference.
 * 
 * @remark
 * the current reference should be a IViewElement or prepared json graph.
 */
export const PATH_LOCAL = '.';
/**
 * Sympbol used by __JOE's__ Json pointer (at the start) to specify we need 
 * to jump up to the parent of the current reference reference.
 * @example
 * '..>myParentProp'
 */
export const PATH_PARENT = '..';
/**
 * Sympbol used by __JOE__ as Json pointer separator.
 * @example
 * '$>myprop'
 *                                                            . */
export const PATH_NEXT = '>';
/**
 * Sympbol used as Key/Value separator.
 * 
 * Example: key:value                                                            .
 */

export const KEYVALUE_SEPARATOR = ':';
/**
 * Sympbol used as multiple Key/Value separator.
 * 
 * Example: key1:value1, key2:value2                                                            .
 */
export const KEYVALUEPAIR_SEPARATOR = ',';
/**
 * Constant for quote.
 */
export const QUOTE = "'";
/**
 * Constant for double quote.
 */
export const DOUBLEQUOTE = '"';
/**
 * Sympbol used as numeric prefix.
 * 
 * __JOE__ Json path doesn't use ' or ": all values are strings by default.
 * To specify a numeric value it should be prefixed by a #.
 * Example: #10                                                            .
 */
export const NUMERIC_PREFIX = '#';
/**
 * Sympbol used as numeric prefix to identify a string value as Double format: 
 * 
 * __JOE__ Json path doesn't use ' or ": all values are strings by default.
 * To specify a numeric value it should be prefixed by a #.
 * Example: #10                                                            .
 */
export const DOUBLE_PREFIX = '#';
/**
 * #
 */
export const REFRESH_DATAPATH = '**/*';
