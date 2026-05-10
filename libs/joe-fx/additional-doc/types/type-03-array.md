# Tarray (file type.array.ts)

## Array Options

```typescript
export interface ArrayOptions {
  title: string;
  minlength: number;
  maxlength: number;
  items: PropertySchema; // = AnySchema | AnySchema[];
}
```

## Tarray class

```typescript
export class Tstring implements StringOptions, BaseType {

  public viewctor: SetviewType;
  public type: ArrayTypeKey; //='array'
  public title: string;
  public items: PropertySchema;
  public itemsTypeDef: ArrayInfo;
  public patern: number;
  public minlength: number;
  public maxlength: number;
  public size: number;
  
  public get hasScalarItems(): boolean {}
  public get hasObjectItems(): boolean {}
  public get isTuple(): boolean {}
  public get isMultiDimension(): boolean {}

  
  /**
    * Tstring constructor  
    */
  constructor ( options: ArrayOptions, name?: string ){}
  
  public options(): ArrayOptions {}
  
  public defaultValue(): any[] {}

  public prepare( obj: any, parent?: any, path: string = PATH_ROOT, recursive: boolean = true ) {}

  public unprepare( obj: any ) {}
  public validate( subject: any, action: ValidationAction, scope?: string | object, previousErrors?: ValidationError ): ValidationError {}

  public fillValidationSummary( objErrors: ValidationError, summary: RuntimeSummary, path: string ): RuntimeSummary {}

}
```

|       t types |  definition
| ------------- | :--------------- |
| t.string._    | Text with no constraint. |
| t.string.text | Text limited to 2000 char. |
| t.string.smalltext | Text limited to 500 char. |
| t.string.line | Text limited to 250 char. |
| t.string.sentence | Text limited to 250 char. |
| t.string.words | Text limited to 150 char. |
| t.string.name | Text limited to 75 char. |
| t.string.word | Text limited to 35 char. |
| t.string.id | Token limited to 50 char. |
| t.string.ip | Ip v4 or v6 '##0.##0.##0.##0'. |
| t.string.ip | Ip rz'##0.##0.##0.##0/#0'. |


```typescript
    /** Mandatory text limited to 50 char.*/
    export const id = new Tstring( StringDef.ID );
    /** Mandatory text to write an ip v4 or v6.*/
    export const ip = new Tstring(
      {
        title: 'S_IP',
        minlength: 7,
        maxlength: 40,
        pattern: ipRegExText,
        patternModel: '##0.##0.##0.##0'
      } );
    export const iprange = new Tstring(
      {
        title: 'S_IP',
        minlength: 7,
        maxlength: 40,
        pattern: ipRegExText,
        patternModel: '##0.##0.##0.##0/#0'
      } );
    export const url = new Tstring(
      {
        title: 'S_IP',
        minlength: 8,
        maxlength: 180,
        pattern: urlRegExText,
        patternModel: 'http(s)://xxxx.xxx'
      } );
    /** Mandatory text as path */
    export const path = new Tstring(
      {
        title: 'S_PATH',
        minlength: 1,
        maxlength: 150,
        pattern: PATH_PATTERN,
        patternModel: '$->x->y'
      } );
```