/**
 * OpenApi v3 Specification.
 */
export interface OpenApiObject {
    /**
     * Semantic OpenApi Version
     */
    openapi: string;
    info: InfoObject;
    servers?: ServerObject[];
    paths: PathsObject;
    components?: ComponentsObject;
    security?: SecurityRequirementObject[];
    tags?: TagObject[];
    externalDocs?: ExternalDocumentationObject;
}

export interface ExternalDocumentationObject {
    description?: string;
    url: string;
}

export interface TagObject {
    name: string;
    description?: string;
    externalDocs?: ExternalDocumentationObject;
}

export interface SecurityRequirementObject {
    [securitySchemeName: string]: string[];
}

/**
 * Requirement on string keys: '^[a-zA-Z0-9\.\-_]+$'.
 */
export interface ComponentsObject {
    schemas?: ApiMap<SchemaObject | ReferenceObject>;
    responses?: ApiMap<ResponseObject | ReferenceObject>;
    parameters?: ApiMap<ExampleObject | ReferenceObject>;
    requestBodies?: ApiMap<RequestBodyObject | ReferenceObject>;
    headers?: ApiMap<HeaderObject | ReferenceObject>;
    securitySchemes?: ApiMap<SecuritySchemeObject | ReferenceObject>;
    links?: ApiMap<LinkObject | ReferenceObject>;
    callbacks?: ApiMap<CallbackObject | ReferenceObject>;
}

export interface CallbackObject {
    [expression: string]: PathItemObject;
}

export interface LinkObject {
    operationRef?: string;
    operationId?: string;
    parameters?: ApiMap<any | string>;
    requestBody?: any | string;
    description?: string;
    server?: ServerObject;
}

export interface SecuritySchemeObject {
    type: "apiKey" | "http" | "oauth2" | "openIdConnect";
    description?: string;
}

export interface ApikeySecuritySchemeObject extends SecuritySchemeObject {
    type: "apiKey";
    name: string;
    in: "query" | "header" | "cookie";
}

export interface HttpSecuritySchemeObject extends SecuritySchemeObject {
    type: "http";
    scheme: string;
    bearerFormat?: string;
}

export interface OAuth2SecuritySchemeObject extends SecuritySchemeObject {
    type: "oauth2";
    flows: OAuthFlowsObject;
}

export interface OAuthFlowsObject {
    implicit?: OAuthFlowObject;
    password?: OAuthFlowObject;
    clientCredentials?: OAuthFlowObject;
    authorizationCode?: OAuthFlowObject;
}

export interface OAuthFlowObject {
    authorizationUrl: string;
    tokenUrl: string;
    refreshUrl?: string;
    scopes: ApiMap<string>;
}

export interface OpenIdConnectSecuritySchemeObject extends SecuritySchemeObject {
    type: "openIdConnect";
    openIdConnectUrl: string;
}

export interface HeaderObject {
    description?: string;
    required?: boolean;
    deprecated?: boolean;
    allowEmptyValue?: boolean;
    style?: string;
    explode?: boolean;
    allowReserved?: boolean;
    schema?: SchemaObject | ReferenceObject;
    example?: any;
    examples?: ApiMap<ExampleObject | ReferenceObject>;
    content?: ApiMap<MediaTypeObject>;
}

export interface RequestBodyObject {
    description?: string;
    content: ApiMap<MediaTypeObject>;
    required?: boolean;
}

export interface ExampleObject {
    summary?: string;
    description?: string;
    value?: any;
    externalValue?: string;
}

export interface ResponseObject {
    description: string;
    headers?: ApiMap<HeaderObject | ReferenceObject>;
    content?: ApiMap<MediaTypeObject>;
    links?: ApiMap<LinkObject | ReferenceObject>;
}

export interface ReferenceObject {
    $ref: string;
}

export interface SchemaObject {
    type: string;
    title?: string;
    /**
     * for type number
     */
    multipleOf?: number;
    /**
     * for type number
     */
    maximum?: number;
    /**
     * for type number
     */
    exclusiveMaximum?: number;
    /**
     * for type number
     */
    minimum?: number;
    /**
     * for type number
     */
    exclusiveMinimum?: number;
    /**
     * for type string
     */
    maxLength?: number;
    /**
     * for type string
     */
    minLength?: number;
    /**
     * for type string
     */
    pattern?: RegExp;
    /**
     * for type array
     */
    maxItems?: number;
    /**
     * for type array
     */
    minItems?: number;
    /**
     * for type array
     */
    uniqueItems?: boolean;
    /**
     * for type object
     */
    maxProperties?: number;
    /**
     * for type object
     */
    minProperties?: number;
    /**
     * for type object
     */
    required?: string[];
    enum?: any[];
    allOf?: Array<SchemaObject | ReferenceObject>;
    anyOf?: Array<SchemaObject | ReferenceObject>;
    oneOf?: Array<SchemaObject | ReferenceObject>;
    not?: Array<SchemaObject | ReferenceObject>;
    items?: SchemaObject | ReferenceObject;
    properties?: Record<string, SchemaObject | ReferenceObject>;
    additionalProperties?: boolean | SchemaObject | ReferenceObject;
    description?: string;
    /**
     * <table>
     *     <tr><th>type</th>    <th>format</th> <th>Comments</th></tr>
     *     <tr><td>integer</td> <td>int32</td>    <td>signed 32 bits</td></tr>
     *     <tr><td>integer</td> <td>int64</td>    <td>signed 64 bits (a.k.a long)</td></tr>
     *     <tr><td>number</td>    <td>float</td>  <td></td></tr>
     *     <tr><td>number</td>    <td>double</td> <td></td></tr>
     *     <tr><td>string</td>  <td></td>       <td></td></tr>
     *     <tr><td>string</td>    <td>byte</td>    <td>base64 encoded characters</td></tr>
     *     <tr><td>string</td>    <td>binary</td> <td>any sequence of octets</td></tr>
     *     <tr><td>boolean</td> <td></td>       <td></td></tr>
     *     <tr><td>string</td>    <td>date</td>    <td>As defined by full-date - [RFC3339]</td></tr>
     *     <tr><td>string</td>    <td>date-time</td>    <td>As defined by date-time - [RFC3339]</td></tr>
     *     <tr><td>string</td>    <td>password</td>    <td>A hint to UIs to obscure input.</td></tr>
     * </table>
     */
    format?: string;
    default?: any;
    nullable?: boolean;
    discriminator?: DiscriminatorObject;
    readOnly?: boolean;
    writeOnly?: boolean;
    xml?: XMLObject;
    externalDocs?: ExternalDocumentationObject;
    example?: any;
    deprecated?: boolean;
}

export interface XMLObject {
    name?: string;
    namespace?: string;
    prefix?: string;
    attribute?: boolean;
    wrapped?: boolean;
}

export interface DiscriminatorObject {
    propertyName: string;
    mapping?: ApiMap<string>;
}

/**
 * Path must begin with '/'.
 */
export interface PathsObject {
    [path: string]: PathItemObject;
}

export interface PathItemObject {
    /**
     * Exmaple: #/components/schemas/Pet
     */
    $ref?: string;
    summary?: string;
    description?: string;
    get?: OperationObject;
    put?: OperationObject;
    post?: OperationObject;
    delete?: OperationObject;
    options?: OperationObject;
    head?: OperationObject;
    patch?: OperationObject;
    trace?: OperationObject;
    servers?: ServerObject[];
    parameters?: Array<ParameterObject | ReferenceObject>;
}

export interface ParameterObject {
    name: string;
    in: "query" | "header" | "path" | "cookie";
    description?: string;
    required?: boolean;
    deprecated?: boolean;
    allowEmptyValue?: boolean;
    style?: string;
    explode?: boolean;
    allowReserved?: boolean;
    schema?: SchemaObject | ReferenceObject;
    example?: any;
    examples?: ApiMap<ExampleObject | ReferenceObject>;
    content?: ApiMap<MediaTypeObject>;
}

export interface MediaTypeObject {
    schema?: SchemaObject | ReferenceObject;
    example?: any;
    examples?: ApiMap<ExampleObject | ReferenceObject>;
    encoding?: ApiMap<EncodingObject>;
}

export interface EncodingObject {
    contentType?: string;
    headers?: ApiMap<HeaderObject | ReferenceObject>;
    style?: string;
    explode?: string;
    allowReserved?: string;
}

export interface OperationObject {
    tags?: string[];
    summary?: string;
    description?: string;
    externalDocs?: ExternalDocumentationObject;
    operationId?: string;
    parameters?: Array<ParameterObject | ReferenceObject>;
    requestBody?: RequestBodyObject | ReferenceObject;
    responses: ResponsesObject;
    callbacks?: ApiMap<CallbackObject | ReferenceObject>;
    deprecated?: boolean;
    security?: SecurityRequirementObject[];
    server?: ServerObject[];
}

export interface ResponsesObject {
    default?: ResponseObject | ReferenceObject;

    [code: number]: ResponseObject | ReferenceObject;
}

export interface ServerObject {
    url: string;
    description?: string;
    variables?: ApiMap<ServerVariableObject>;
}

export interface ServerVariableObject {
    enum?: string[];
    default: string;
    description?: string;
}

export interface InfoObject {
    title: string;
    description?: string;
    termsOfService?: string;
    contact?: ContactObject;
    license?: LicenseObject;
    /**
     * Version of the specific Document
     */
    version: string;
}

export type ApiMap<T> = Record<string, T>;

export interface LicenseObject {
    name: string;
    url?: string;
}

export interface ContactObject {
    name?: string;
    url?: string;
    email?: string;
}

export const enumNameSymbol = Symbol("enumName");
export const keyTypeSymbol = Symbol("keyType");