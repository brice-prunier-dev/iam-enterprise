import {
    NumberPattern,
    Tstring,
    Tnumber,
    Tarray,
    ArrayDef,
    StringDef} from '../src';

const STR_DEF: StringDef = {
    type: 'string',
    title: 'S_FREE',
    minlength: 1,
    maxlength: 4000
};

const STR_ENUM: StringDef = {
    type: 'string',
    title: 'S_ENUM',
    enum: ['Aa', 'Bb', 'Cc']
};



const STR_TOKEN_DEF: StringDef = {
    type: 'string',
    title: 'S_TOKEN',
    pattern: '^[A-Za-z-0-9]+[A-Za-z-0-9-_:>]*$',
    patternModel: 'Only alpha numeric with - and _',
    maxlength: 150,
    minlength: 2
};



export const STR_ENUM_TYPE = new Tstring(STR_ENUM);
export const STR_TYPE = new Tstring(STR_DEF);
export const STR_TOKEN = new Tstring(STR_TOKEN_DEF);

export const STR_ARRAY_DEF: ArrayDef = {
    type: 'array',
    title: 'string_t_array_0_n',
    minlength: 0,
    maxlength: Number.MAX_SAFE_INTEGER,
    items: STR_TYPE
};

export const STR_ARRAY_TYPE = new Tarray<string>(STR_ARRAY_DEF);


export const INT_TYPE = new Tnumber({
    type: 'number',
    title: 'INT',
    pattern: NumberPattern.INT,
    default: 0,
    minimum: Number.MIN_SAFE_INTEGER,
    maximum: Number.MAX_SAFE_INTEGER
});

