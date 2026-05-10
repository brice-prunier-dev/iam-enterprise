'use strict';

customElements.define('compodoc-menu', class extends HTMLElement {
    constructor() {
        super();
        this.isNormalMode = this.getAttribute('mode') === 'normal';
    }

    connectedCallback() {
        this.render(this.isNormalMode);
    }

    render(isNormalMode) {
        let tp = lithtml.html(`
        <nav>
            <ul class="list">
                <li class="title">
                    <a href="index.html" data-type="index-link">joe-fx documentation</a>
                </li>

                <li class="divider"></li>
                ${ isNormalMode ? `<div id="book-search-input" role="search"><input type="text" placeholder="Type to search"></div>` : '' }
                <li class="chapter">
                    <a data-type="chapter-link" href="index.html"><span class="icon ion-ios-home"></span>Getting started</a>
                    <ul class="links">
                        <li class="link">
                            <a href="overview.html" data-type="chapter-link">
                                <span class="icon ion-ios-keypad"></span>Overview
                            </a>
                        </li>
                        <li class="link">
                            <a href="index.html" data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>README
                            </a>
                        </li>
                                <li class="link">
                                    <a href="dependencies.html" data-type="chapter-link">
                                        <span class="icon ion-ios-list"></span>Dependencies
                                    </a>
                                </li>
                                <li class="link">
                                    <a href="properties.html" data-type="chapter-link">
                                        <span class="icon ion-ios-apps"></span>Properties
                                    </a>
                                </li>
                    </ul>
                </li>
                    <li class="chapter additional">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#additional-pages"'
                            : 'data-bs-target="#xs-additional-pages"' }>
                            <span class="icon ion-ios-book"></span>
                            <span>Additional documentation</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="additional-pages"' : 'id="xs-additional-pages"' }>
                                    <li class="chapter inner">
                                        <a data-type="chapter-link" href="additional-documentation/why-joe.html" data-context-id="additional">
                                            <div class="menu-toggler linked" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#additional-page-aaba346f7828020ef7670f137d3cd4f404563a457f5931ce68f8d0da2f5d9d7b23b58cb0855c62697d9b86c22a9cba766307f2f5502364c8ddda3c01fb4248f5"' : 'data-bs-target="#xs-additional-page-aaba346f7828020ef7670f137d3cd4f404563a457f5931ce68f8d0da2f5d9d7b23b58cb0855c62697d9b86c22a9cba766307f2f5502364c8ddda3c01fb4248f5"' }>
                                                <span class="link-name">Why Joe</span>
                                                <span class="icon ion-ios-arrow-down"></span>
                                            </div>
                                        </a>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="additional-page-aaba346f7828020ef7670f137d3cd4f404563a457f5931ce68f8d0da2f5d9d7b23b58cb0855c62697d9b86c22a9cba766307f2f5502364c8ddda3c01fb4248f5"' : 'id="xs-additional-page-aaba346f7828020ef7670f137d3cd4f404563a457f5931ce68f8d0da2f5d9d7b23b58cb0855c62697d9b86c22a9cba766307f2f5502364c8ddda3c01fb4248f5"' }>
                                            <li class="link for-chapter2">
                                                <a href="additional-documentation/why-joe/joe-view.html" data-type="entity-link" data-context="sub-entity" data-context-id="additional">Joe View</a>
                                            </li>
                                            <li class="link for-chapter2">
                                                <a href="additional-documentation/why-joe/joe-view-element.html" data-type="entity-link" data-context="sub-entity" data-context-id="additional">JOE View Element</a>
                                            </li>
                                            <li class="link for-chapter2">
                                                <a href="additional-documentation/why-joe/joe-domain-model.html" data-type="entity-link" data-context="sub-entity" data-context-id="additional">JOE Domain Model</a>
                                            </li>
                                            <li class="link for-chapter2">
                                                <a href="additional-documentation/why-joe/joe-types.html" data-type="entity-link" data-context="sub-entity" data-context-id="additional">Joe Types</a>
                                            </li>
                                            <li class="link for-chapter2">
                                                <a href="additional-documentation/why-joe/type-core-features.html" data-type="entity-link" data-context="sub-entity" data-context-id="additional">Type Core Features</a>
                                            </li>
                                            <li class="link for-chapter2">
                                                <a href="additional-documentation/why-joe/array-typey.html" data-type="entity-link" data-context="sub-entity" data-context-id="additional">Array Typey</a>
                                            </li>
                                        </ul>
                                    </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#classes-links"' :
                            'data-bs-target="#xs-classes-links"' }>
                            <span class="icon ion-ios-paper"></span>
                            <span>Classes</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="classes-links"' : 'id="xs-classes-links"' }>
                            <li class="link">
                                <a href="classes/DataInfo.html" data-type="entity-link" >DataInfo</a>
                            </li>
                            <li class="link">
                                <a href="classes/ElementValidationState.html" data-type="entity-link" >ElementValidationState</a>
                            </li>
                            <li class="link">
                                <a href="classes/ListValidationState.html" data-type="entity-link" >ListValidationState</a>
                            </li>
                            <li class="link">
                                <a href="classes/Logger.html" data-type="entity-link" >Logger</a>
                            </li>
                            <li class="link">
                                <a href="classes/Mapview.html" data-type="entity-link" >Mapview</a>
                            </li>
                            <li class="link">
                                <a href="classes/MapviewEditor.html" data-type="entity-link" >MapviewEditor</a>
                            </li>
                            <li class="link">
                                <a href="classes/MetadataHelper.html" data-type="entity-link" >MetadataHelper</a>
                            </li>
                            <li class="link">
                                <a href="classes/Objview.html" data-type="entity-link" >Objview</a>
                            </li>
                            <li class="link">
                                <a href="classes/ObjviewEditor.html" data-type="entity-link" >ObjviewEditor</a>
                            </li>
                            <li class="link">
                                <a href="classes/RuntimeError.html" data-type="entity-link" >RuntimeError</a>
                            </li>
                            <li class="link">
                                <a href="classes/RuntimeMessage.html" data-type="entity-link" >RuntimeMessage</a>
                            </li>
                            <li class="link">
                                <a href="classes/RuntimeSummary.html" data-type="entity-link" >RuntimeSummary</a>
                            </li>
                            <li class="link">
                                <a href="classes/Setview.html" data-type="entity-link" >Setview</a>
                            </li>
                            <li class="link">
                                <a href="classes/SetviewEditor.html" data-type="entity-link" >SetviewEditor</a>
                            </li>
                            <li class="link">
                                <a href="classes/Tarray.html" data-type="entity-link" >Tarray</a>
                            </li>
                            <li class="link">
                                <a href="classes/TarrayArrayItem.html" data-type="entity-link" >TarrayArrayItem</a>
                            </li>
                            <li class="link">
                                <a href="classes/TarraySimpleItem.html" data-type="entity-link" >TarraySimpleItem</a>
                            </li>
                            <li class="link">
                                <a href="classes/TarrayTupleItem.html" data-type="entity-link" >TarrayTupleItem</a>
                            </li>
                            <li class="link">
                                <a href="classes/Tbool.html" data-type="entity-link" >Tbool</a>
                            </li>
                            <li class="link">
                                <a href="classes/Tmap.html" data-type="entity-link" >Tmap</a>
                            </li>
                            <li class="link">
                                <a href="classes/TmapArrayItem.html" data-type="entity-link" >TmapArrayItem</a>
                            </li>
                            <li class="link">
                                <a href="classes/TmapSimpleItem.html" data-type="entity-link" >TmapSimpleItem</a>
                            </li>
                            <li class="link">
                                <a href="classes/Tnumber.html" data-type="entity-link" >Tnumber</a>
                            </li>
                            <li class="link">
                                <a href="classes/Tobject.html" data-type="entity-link" >Tobject</a>
                            </li>
                            <li class="link">
                                <a href="classes/TobjectArrayItemProperty.html" data-type="entity-link" >TobjectArrayItemProperty</a>
                            </li>
                            <li class="link">
                                <a href="classes/TobjectMapProperty.html" data-type="entity-link" >TobjectMapProperty</a>
                            </li>
                            <li class="link">
                                <a href="classes/TobjectSimpleProperty.html" data-type="entity-link" >TobjectSimpleProperty</a>
                            </li>
                            <li class="link">
                                <a href="classes/Tstring.html" data-type="entity-link" >Tstring</a>
                            </li>
                            <li class="link">
                                <a href="classes/Txobject.html" data-type="entity-link" >Txobject</a>
                            </li>
                            <li class="link">
                                <a href="classes/TxobjectSimpleProperty.html" data-type="entity-link" >TxobjectSimpleProperty</a>
                            </li>
                            <li class="link">
                                <a href="classes/ValidationHandler.html" data-type="entity-link" >ValidationHandler</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#interfaces-links"' :
                            'data-bs-target="#xs-interfaces-links"' }>
                            <span class="icon ion-md-information-circle-outline"></span>
                            <span>Interfaces</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? ' id="interfaces-links"' : 'id="xs-interfaces-links"' }>
                            <li class="link">
                                <a href="interfaces/ArrayDef.html" data-type="entity-link" >ArrayDef</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ArrayItemProperty.html" data-type="entity-link" >ArrayItemProperty</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AType.html" data-type="entity-link" >AType</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/BaseElementType.html" data-type="entity-link" >BaseElementType</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/BaseProperty.html" data-type="entity-link" >BaseProperty</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/BaseType.html" data-type="entity-link" >BaseType</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/BaseTypeBehaviour.html" data-type="entity-link" >BaseTypeBehaviour</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/BooleanDef.html" data-type="entity-link" >BooleanDef</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ChangeItem.html" data-type="entity-link" >ChangeItem</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/DataPayload.html" data-type="entity-link" >DataPayload</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/EditCache.html" data-type="entity-link" >EditCache</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ElementTypeBehaviour.html" data-type="entity-link" >ElementTypeBehaviour</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IDataInfo.html" data-type="entity-link" >IDataInfo</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IEditor.html" data-type="entity-link" >IEditor</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IElementContext.html" data-type="entity-link" >IElementContext</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IElementMessage.html" data-type="entity-link" >IElementMessage</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IMapElementOf.html" data-type="entity-link" >IMapElementOf</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IndexableType.html" data-type="entity-link" >IndexableType</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IndexDef.html" data-type="entity-link" >IndexDef</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IObjElementOf.html" data-type="entity-link" >IObjElementOf</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IRuntimeSummary.html" data-type="entity-link" >IRuntimeSummary</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ISetElementOf.html" data-type="entity-link" >ISetElementOf</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IViewElement.html" data-type="entity-link" >IViewElement</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MapDef.html" data-type="entity-link" >MapDef</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MapProperty.html" data-type="entity-link" >MapProperty</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MType.html" data-type="entity-link" >MType</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/NumberDef.html" data-type="entity-link" >NumberDef</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ObjectDef.html" data-type="entity-link" >ObjectDef</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OType.html" data-type="entity-link" >OType</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Property.html" data-type="entity-link" >Property</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ScalarProperty.html" data-type="entity-link" >ScalarProperty</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SelectorDef.html" data-type="entity-link" >SelectorDef</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/StringDef.html" data-type="entity-link" >StringDef</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/StringMap.html" data-type="entity-link" >StringMap</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TupleDef.html" data-type="entity-link" >TupleDef</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ValidationState.html" data-type="entity-link" >ValidationState</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/XObjectDef.html" data-type="entity-link" >XObjectDef</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/XType.html" data-type="entity-link" >XType</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#miscellaneous-links"'
                            : 'data-bs-target="#xs-miscellaneous-links"' }>
                            <span class="icon ion-ios-cube"></span>
                            <span>Miscellaneous</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="miscellaneous-links"' : 'id="xs-miscellaneous-links"' }>
                            <li class="link">
                                <a href="miscellaneous/enumerations.html" data-type="entity-link">Enums</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/functions.html" data-type="entity-link">Functions</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/typealiases.html" data-type="entity-link">Type aliases</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/variables.html" data-type="entity-link">Variables</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <a data-type="chapter-link" href="coverage.html"><span class="icon ion-ios-stats"></span>Documentation coverage</a>
                    </li>
                    <li class="divider"></li>
                    <li class="copyright">
                        Documentation generated using <a href="https://compodoc.app/" target="_blank" rel="noopener noreferrer">
                            <img data-src="images/compodoc-vectorise-inverted.png" class="img-responsive" data-type="compodoc-logo">
                        </a>
                    </li>
            </ul>
        </nav>
        `);
        this.innerHTML = tp.strings;
    }
});