import {
    SetviewConstructor,
    AType,
    MetadataHelper,
    IViewElement,
    readPath,
    SortComparer
} from '../core';
import {Tobject} from './object';

let _arrayViewConstructor: SetviewConstructor;

export module ArrayViewFactory {
    export function InitializeConstructor(viewctor: SetviewConstructor) {
        _arrayViewConstructor = viewctor;
    }

    export function Create<T>(args: any[], type: AType, parent?: any): Array<T> & IViewElement {
        return new _arrayViewConstructor(args, parent, type) as Array<T> & IViewElement;
    }

    export function PropertyComparer(sort: string): SortComparer {
        let propname = sort;
        let isAsc = true;
        if (sort.endsWith('!')) {
            propname = sort.substring(0, sort.length - 1);
            isAsc = false;
        }
        return (a, b) => {
            let a_value = readPath(a, propname);
            let b_value = readPath(b, propname);
            if (typeof a_value === 'string') {
                a_value = a_value.toLocaleLowerCase();
                b_value = (b_value || '').toLocaleLowerCase();
            }

            return a_value === b_value ? 0 : (a_value > b_value ? 1 : -1) * (isAsc ? 1 : -1);
        };
    }
    export function PropertiesComparer(sort: string[]): SortComparer {
        // console.log( '%c' + 'buildSortComparer ' + JSON.stringify( sort ), 'color: orange;' );
        switch (sort.length) {
            case 1:
                return ArrayViewFactory.PropertyComparer(sort[0]!);
            case 2:
                const comp21 = ArrayViewFactory.PropertyComparer(sort[0]!);
                const comp22 = ArrayViewFactory.PropertyComparer(sort[1]!);
                return (a, b) => {
                    // console.log( '%c' + 'compare-2: [' + readPath( a, sort[ 0 ] )
                    //   + ', ' + readPath( a, sort[ 1 ] ) + '] to ['
                    //   + readPath( b, sort[ 0 ] ) + ', ' + readPath( b, sort[ 1 ] )
                    //   + ']', 'color: blue;' );
                    const r21 = comp21(a, b);
                    const r = r21 !== 0 ? r21 : comp22(a, b);
                    // if ( r < 0 ) {
                    //   tslint:disable-ne1xt-line: max-line-length
                    //   console.log( '%c' + ' [' + readPath( a, sort[ 0 ] ) + ', '
                    //     + readPath( a, sort[ 1 ] ) + '] > [' + readPath( b, sort[ 0 ] )
                    //     + ', ' + readPath( b, sort[ 1 ] ) + ']', 'color: orange;' );
                    // } else {
                    //   tslint:disable-next-line: max-line-length
                    //   console.log( '%c' + ' [' + readPath( a, sort[ 0 ] ) + ', '
                    //     + readPath( a, sort[ 1 ] ) + '] < [' + readPath( b, sort[ 0 ] )
                    //     + ', ' + readPath( b, sort[ 1 ] ) + ']', 'color: orange;' );
                    // }
                    return r;
                };
            case 3:
                const comp31 = ArrayViewFactory.PropertyComparer(sort[0]!);
                const comp32 = ArrayViewFactory.PropertyComparer(sort[1]!);
                const comp33 = ArrayViewFactory.PropertyComparer(sort[2]!);
                return (a, b) => {
                    const r31 = comp31(a, b);
                    const r32 = comp32(a, b);
                    return r31 !== 0 ? r31 : r32 !== 0 ? r32 : comp33(a, b);
                };
            case 4:
                const comp41 = ArrayViewFactory.PropertyComparer(sort[0]!);
                const comp42 = ArrayViewFactory.PropertyComparer(sort[1]!);
                const comp43 = ArrayViewFactory.PropertyComparer(sort[2]!);
                const comp44 = ArrayViewFactory.PropertyComparer(sort[3]!);
                return (a, b) => {
                    const r41 = comp41(a, b);
                    const r42 = comp42(a, b);
                    const r43 = comp42(a, b);
                    return r41 !== 0 ? r41 : r42 !== 0 ? r42 : r43 !== 0 ? r43 : comp44(a, b);
                };
            case 5:
                const comp51 = ArrayViewFactory.PropertyComparer(sort[0]!);
                const comp52 = ArrayViewFactory.PropertyComparer(sort[1]!);
                const comp53 = ArrayViewFactory.PropertyComparer(sort[2]!);
                const comp54 = ArrayViewFactory.PropertyComparer(sort[3]!);
                const comp55 = ArrayViewFactory.PropertyComparer(sort[4]!);
                return (a, b) => {
                    const r51 = comp51(a, b);
                    const r52 = comp52(a, b);
                    const r53 = comp53(a, b);
                    const r54 = comp54(a, b);
                    return r51 !== 0
                        ? r51
                        : r52 !== 0
                            ? r52
                            : r53 !== 0
                                ? r53
                                : r54 !== 0
                                    ? r54
                                    : comp55(a, b);
                };
            default:
                throw new Error('Invalid comparaison...');
        }
    }

    export function SortFromTypeDef<T>(array: T[], otype?: Tobject<T>): T[] {
        if (array.length < 2) {
            return array;
        }
        if (!otype) {
            const datainfo = MetadataHelper.getTypeInfo(array[0]);
            if (datainfo) {
                otype = datainfo.type as Tobject<T>;
            }
        }
        if (otype && otype.index && otype.index.sort) {
            const comparer = ArrayViewFactory.PropertiesComparer(otype.index.sort as string[]);
            array = array.sort(comparer);
        }
        return array;
    }

    export function SortFromPropertyList<T>(array: T[], sort: string[]): T[] {
        if (array.length < 2) {
            return array;
        }
        const comparer = ArrayViewFactory.PropertiesComparer(sort);
        return array.sort(comparer);
    }
}
