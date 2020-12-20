import ts from "typescript";
import {
    CallExpression,
    FunctionDeclaration,
    Identifier,
    isParameter,
    isVariableDeclaration,
    PropertyAccessExpression,
    SignatureDeclaration,
    Statement,
    StringLiteral,
    SyntaxKind,
    SyntaxList
} from "typescript";
import path from "path";
import { Optional, Nullable } from "../../types";
import {
    RequestBodyObject,
    ParameterObject,
    OpenApiObject,
    PathsObject,
    MediaTypeObject,
    PathItemObject,
    OperationObject,
    SchemaObject,
    ResponsesObject,
    enumNameSymbol,
    keyTypeSymbol
} from "./types";

interface DocEntry {
    name?: string;
    fileName?: string;
    documentation?: string;
    type?: string;
    constructors?: DocEntry[];
    parameters?: DocEntry[];
    returnType?: string;
}

type Middleware = ts.Node

interface PathEntry {
    path: string;
    method: string;
    middleware: Middleware;
}

interface PathObject<T> {
    [path: string]: T;
}

interface RouteEntry {
    [method: string]: Middleware;
}

interface RouterEntry {
    paths: PathEntry[];
    middlewares: Middleware[];
    routes: PathObject<RouteEntry>;
    subRouter: PathObject<FunctionEntry>;
}

interface FunctionEntry {
    router: ts.Symbol[];
    returnRouter?: ts.Symbol;
    exported: boolean;
}

interface ExportExpressResult {
    [exportFunctionName: string]: RouterResult;
}

interface TypeResult {
    type: "Array" | "boolean" | "number" | "string" | "object" | "null" | "Union" | "Promise" | "Enum" | "Record" | "any";
    /**
     * for literal values
     */
    literalValue?: any;
    optional?: boolean;
    nullable?: boolean;
}

interface UnionType extends TypeResult {
    type: "Union";
    unionTypes: TypeResult[];
    literalValue: undefined;
}

interface ArrayType extends TypeResult {
    type: "Array";
    elementType: TypeResult;
    literalValue?: any[];
}

type ObjectProperties = Record<string, TypeResult>;

interface ObjectType extends TypeResult {
    type: "object";
    name: string;
    properties: ObjectProperties;
    literalValue?: Record<string, unknown>;
    isGlobal?: boolean;
}

interface BooleanType extends TypeResult {
    type: "boolean";
    literalValue?: boolean;
}

interface NumberType extends TypeResult {
    type: "number";
    literalValue?: number;
}

interface StringType extends TypeResult {
    type: "string";
    literalValue?: string;
}

interface NullType extends TypeResult {
    type: "null";
    literalValue?: null;
}

interface PromiseType extends TypeResult {
    type: "Promise";
    genericType: TypeResult;
    rejected: boolean;
}

interface EnumType extends TypeResult {
    type: "Enum";
    name: string;
    member: Record<string, TypeResult>;
    // the exact member if available
    literalValue?: string;
}

interface RecordType extends TypeResult {
    type: "Record";
    keyType: TypeResult;
    valueType: TypeResult;
}

// this should hold the requirements on the request
// and the possible return types and error codes
interface MiddlewareResult {
    returnTypes: Record<number, TypeResult>;
    queryType?: Record<string, TypeResult>;
    bodyType?: Record<string, TypeResult>;
}

type HttpMethod = "get" | "delete" | "post" | "put";

interface RouteResult {
    [method: string]: MiddlewareResult;
}

interface PathResult {
    path: string;
    middleware: MiddlewareResult;
    method: HttpMethod;
}

interface RouterResult {
    // the sub routes via *.route
    routes: PathObject<RouteResult>;
    // the direct method paths via e.g. *.get(path, middleware)
    paths: PathResult[];
    // any middleware via *.use
    middlewares: MiddlewareResult[];
    // any router via *.use(path, router)
    subRouter: PathObject<RouterResult>;
    parentRouter?: RouterResult;
}

interface ParentRouterResult extends RouterResult {
    path: string;
    requestObject?: RequestBodyObject;
    parameters?: ParameterObject[];
}

// TODO: 08.08.2020 associate the returned router with correct symbol and called function with correct symbol

interface RequestInfo {
    queryParams: Record<string, TypeResult>;
    bodyParams: Record<string, TypeResult>;
}

interface ResponseInfo {
    header: Record<string, any>;
    body: Nullable<TypeResult>;
}

type TotalResponseInfo = Record<number, ResponseInfo>;

interface StackElement {
    requestSymbol?: ts.Symbol;
    responseSymbol?: ts.Symbol;
    arguments: ts.Node[];
    signature: SignatureDeclaration;
    symbol: ts.Symbol;
    isGlobal: boolean;
}

interface SearchContainer {
    requestInfo: RequestInfo;
    responseInfo: TotalResponseInfo;
    callStack: StackElement[];
    middleware: Middleware;
    middlewareResult: MiddlewareResult;
    currentStackElement: StackElement;
}

/** Generate documentation for all classes in a set of .ts files */
export function generateExpressApiObject(fileNames: string[], options: ts.CompilerOptions): OpenApiObject {
    // Build a program using the set of root file names in fileNames
    const program = ts.createProgram(fileNames, options);

    // Get the checker, we will use it to find more about classes
    const checker = program.getTypeChecker();
    const baseFiles = fileNames.map((value) => path.basename(value));
    const sourceFiles = program.getSourceFiles().filter((value) => baseFiles.includes(path.basename(value.fileName)));

    const parser = new Parser(checker);

    // Visit every sourceFile in the program
    for (const sourceFile of sourceFiles) {
        if (!sourceFile.isDeclarationFile) {
            // Walk the tree to search for classes
            ts.forEachChild(sourceFile, visit);
        }
    }
    const result: ExportExpressResult = parser.getExpressResult();

    // log(JSON.stringify(result, null, 4));
    // print out the doc
    // fs.writeFileSync("classes.json", JSON.stringify(output, undefined, 4));
    return transformToOpenApi(result);


    /** visit nodes finding exported classes */
    function visit(node: ts.Node) {
        if (ts.isVariableDeclaration(node) && ts.SyntaxKind.Identifier === node.name.kind) {
            parser.inspectVariableDeclaration(node);
        } else if (ts.isCallExpression(node)) {
            parser.inspectCall(node);
        } else {
            ts.forEachChild(node, visit);
        }
    }
}

class TypeInferrer {
    private checker: ts.TypeChecker;
    private counter = 0;
    private inErrorBlock = false;

    public constructor(checker: ts.TypeChecker) {
        this.checker = checker;
    }

    public inferNodeType(node: ts.Node, stackElement: StackElement): Nullable<TypeResult> {
        return this.inferType(node, stackElement);
    }

    private inferType(node: ts.Node, stackElement: StackElement): Nullable<TypeResult> {
        if (ts.isIdentifier(node)) {
            const symbol = this.getSymbol(node);

            if (!symbol) {
                log("No Symbol for Identifier: " + node);
            } else {
                const type = this.checker.getTypeOfSymbolAtLocation(symbol, node);

                if (this.checker.typeToString(type) === "any") {
                    return this.inferAny(symbol, stackElement);
                } else {
                    return this.typeToResult(type);
                }
            }
        } else if (ts.isLiteralExpression(node)) {
            const type = this.checker.getTypeAtLocation(node);

            if (this.checker.typeToString(type) === "any") {
                const symbol = this.checker.getSymbolAtLocation(node);

                if (!symbol) {
                    return null;
                }
                return this.inferAny(symbol, stackElement);
            } else {
                return this.typeToResult(type);
            }

        } else if (ts.isCallExpression(node)) {
            const identifier = getFirstCallIdentifier(node);

            if (!identifier) {
                log("No Identifier for CallExpression: " + node.getText());
            } else if (identifier.getText() === "then") {
                const resolvedCallback = node.arguments[0];

                if (ts.isFunctionLike(resolvedCallback)) {
                    const callbackSignature = this.checker.getSignatureFromDeclaration(resolvedCallback);

                    if (callbackSignature) {
                        const type = this.checker.getReturnTypeOfSignature(callbackSignature);
                        return this.typeToResult(type);
                    } else {
                        log("Expected a Signature for the Callback: ", resolvedCallback.getText());
                    }
                } else {
                    log("Expected a function for the Resolve Callback of a 'Promise.then' found: ", resolvedCallback?.getText())
                }
            } else {
                const callSymbol = this.getSymbol(identifier);

                if (!callSymbol) {
                    log("No Symbol for Identifier of CallExpression: " + node.getText());
                } else {
                    const signature = this.checker.getSignatureFromDeclaration(callSymbol.valueDeclaration as FunctionDeclaration);

                    if (!signature) {
                        log("No Signature for CallExpression: " + node.getText());
                    } else {
                        const type = this.checker.getReturnTypeOfSignature(signature);
                        return this.typeToResult(type);
                    }
                }
            }
        }
        return null;
    }

    private inferAny(symbol: ts.Symbol, stackElement: StackElement): Nullable<TypeResult> {
        if (isParameter(symbol.valueDeclaration)) {
            const parentOfFunction = symbol.valueDeclaration.parent.parent;

            // check if this is a callback in a function
            if (ts.isCallExpression(parentOfFunction) && ts.isPropertyAccessExpression(parentOfFunction.expression)) {
                const property = parentOfFunction.expression.name.text;

                // if this a then-able Call, assume a promiselike.then
                if (property === "then") {
                    const leftHandSideExpression = parentOfFunction.expression.expression;

                    // get the promiselike identifier
                    if (ts.isIdentifier(leftHandSideExpression)) {
                        const leftSideSymbol = this.getSymbol(leftHandSideExpression);

                        // if the promiselike identifier is a parameter of the function
                        // then to resolve the type one needs the argument to this function
                        if (leftSideSymbol && ts.isParameter(leftSideSymbol.valueDeclaration) && leftSideSymbol.valueDeclaration.parent === stackElement.signature) {
                            const index = stackElement.signature.parameters.indexOf(leftSideSymbol.valueDeclaration);
                            const argument = stackElement.arguments[index];

                            if (ts.isCallExpression(argument)) {
                                if (ts.isPropertyAccessExpression(argument.expression)) {
                                    const targetValue = argument.expression.expression;

                                    if (ts.isIdentifier(targetValue)) {
                                        const method = argument.expression.name;
                                        if (targetValue.text === "Promise") {
                                            // inspect Promise.* uses
                                            if ((method.text === "resolve") && argument.arguments.length === 1) {
                                                const resolveValue = argument.arguments[0];

                                                const type = this.checker.getTypeAtLocation(resolveValue);
                                                const result = this.typeToResult(type);

                                                if (result) {
                                                    return result;
                                                }

                                                if (ts.isPropertyAccessExpression(resolveValue)) {
                                                    const propertySymbol = this.getSymbol(resolveValue.name);

                                                    if (propertySymbol) {
                                                        const declaration = propertySymbol.valueDeclaration;

                                                        if (ts.hasOnlyExpressionInitializer(declaration) && declaration.initializer) {
                                                            const initializerType = this.checker.getTypeAtLocation(declaration.initializer);
                                                            return this.typeToResult(initializerType);
                                                        } else {
                                                            log("Declaration without Initialization");
                                                        }
                                                    } else {
                                                        log("Unexpected Property Access Expression");
                                                    }
                                                } else {
                                                    log("?");
                                                }
                                            } else {
                                                log("Some other Promise method");
                                            }
                                        } else {
                                            const methodSymbol = this.getSymbol(method);

                                            if (methodSymbol) {
                                                if (ts.isFunctionLike(methodSymbol.valueDeclaration)) {
                                                    return this.inferFunctionLike(methodSymbol.valueDeclaration);
                                                } else {
                                                    const declaration = methodSymbol.declarations[0];

                                                    if (ts.isFunctionLike(declaration)) {
                                                        return this.inferFunctionLike(declaration);
                                                    } else {
                                                        log("?");
                                                    }
                                                    log("?");
                                                }
                                            } else {
                                                log("?");
                                            }
                                        }
                                    } else {
                                        return this.inferType(argument, stackElement);
                                    }
                                } else {
                                    const type = this.checker.getTypeAtLocation(argument);
                                    return this.typeToResult(type);
                                }
                            } else if (ts.isIdentifier(argument)) {
                                return this.inferType(argument, stackElement);
                            } else {
                                log("?");
                            }
                        } else {
                            log("?");
                        }
                    } else {
                        log("?");
                    }
                } else {
                    log("?");
                }
            } else {
                log("?");
            }
        } else if (isVariableDeclaration(symbol.valueDeclaration)) {
            // TODO: 11.08.2020 infer from variable declaration
            log("a variabledeclaration");
        }
        return null;
    }

    private inferFunctionLike(declaration: ts.SignatureDeclaration): Nullable<TypeResult> {
        const signature = this.checker.getSignatureFromDeclaration(declaration);

        if (signature) {
            const returnType = this.checker.getReturnTypeOfSignature(signature);
            return this.typeToResult(returnType, declaration.type);
        } else {
            log("?");
        }
        return null;
    }

    private typeToResult(type: ts.Type, typeNode?: ts.TypeNode): Nullable<TypeResult> {
        try {
            if (this.counter > 10) {
                log("Type resolving goes too deep for: " + this.checker.typeToString(type))
                return null;
            }
            this.counter++;
            return this.recursingTypeToResult(type, typeNode);
        } finally {
            this.counter--;
        }
    }

    private recursingTypeToResult(type: ts.Type, typeNode?: ts.TypeNode): Nullable<TypeResult> {
        const typeString = this.checker.typeToString(type);

        if (typeString === "number") {
            return {
                type: "number",
            } as NumberType;
        } else if (typeString === "boolean") {
            return {
                type: "boolean",
            } as BooleanType;
        } else if (typeString === "string") {
            return {
                type: "string",
            } as StringType;
        } else if (typeString === "void" || typeString === "undefined" || typeString === "null") {
            return {
                type: "null",
            } as NullType;
        } else if (typeString === "any") {
            return {
                type: "object",
                properties: {},
            } as ObjectType;
        }

        if (isNumberLiteralType(type)) {
            return {
                type: "number",
                literalValue: type.value
            } as NumberType;
        } else if (isBooleanLiteralType(type)) {
            return {
                type: "boolean",
                literalValue: typeString === "true",
            } as BooleanType;
        } else if (isStringLiteralType(type)) {
            return {
                type: "string",
                literalValue: type.value,
            } as StringType;
        }

        // check if it is enum before checking if it is an union, because enums are "special" unions
        if (isEnumLikeType(type)) {
            return this.getEnumType(type, type.getSymbol() as ts.Symbol);
        }

        if (type.isUnionOrIntersection()) {
            const subTypes = type.types.map(subType => this.typeToResult(subType));
            if (subTypes.some(value => !value)) {
                log("Failed to resolve UnionOrIntersection Type");
                return null;
            }
            if (type.isUnion()) {
                return {
                    type: "Union",
                    unionTypes: this.filterUniqueType(subTypes as TypeResult[]),
                } as UnionType;
            } else {
                const intersection = (type as ts.IntersectionType);

                // for now assume an intersection happens only on object types
                if (subTypes.some(v => v?.type !== "object")) {
                    log("Failed to resolve intersection. Not all participants resolved to object types!");
                    return null;
                }
                const name = intersection.symbol?.escapedName || intersection.aliasSymbol?.escapedName || "";
                const properties: ObjectProperties = Object.assign({}, ...(subTypes as ObjectType[]).map(v => v.properties));
                return {
                    name,
                    type: "object",
                    properties,
                } as ObjectType;
            }
        } else {
            const constraint = type.getConstraint();

            if (constraint?.isUnionOrIntersection()) {
                return this.typeToResult(constraint);
            }
        }

        // TODO: 12.08.2020 literalValue
        const symbol = type.getSymbol();

        if (!symbol) {
            log("No Symbol for Type");
            return null;
        }
        if (ts.isFunctionLike(symbol.valueDeclaration)) {
            return this.inferFunctionLike(symbol.valueDeclaration);
        }
        if (symbol.name === "Promise") {
            // @ts-expect-error
            const typeArguments = this.checker.getTypeArguments(type);

            if (typeArguments.length === 1) {
                return this.typeToResult(typeArguments[0], this.getFirstTypeNodeArgument(typeNode));
            } else {
                log("Promise should have only one Type argument! Got: " + typeArguments.length);
                return null;
            }
        }
        // an interface extending the mysql "Query" Interface
        // for typing the packet values
        if (symbol.name === "TypedQuery") {
            // @ts-expect-error
            const typeArguments = this.checker.getTypeArguments(type);

            if (typeArguments.length === 1) {
                return {
                    type: "Array",
                    elementType: this.typeToResult(typeArguments[0], this.getFirstTypeNodeArgument(typeNode)),
                } as ArrayType;
            } else {
                log("TypedQuery should have only one Type argument! Got: " + typeArguments.length);
                return null;
            }
        }
        if (symbol.name === "Array") {
            // @ts-expect-error
            const arrayTypes = this.checker.getTypeArguments(type);

            if (arrayTypes.length === 1) {
                const arrayType: ts.Type = arrayTypes[0];
                const elementType = this.typeToResult(arrayType);
                // const elementProperties = checker.getPropertiesOfType(arrayType);
                return {
                    type: "Array",
                    elementType,
                } as ArrayType;
            } else {
                log("Array type does not have exactly one TypeParameter: " + arrayTypes);
                return null;
            }
        }
        if (type.aliasSymbol && type.aliasSymbol.name === "Record") {
            return this.convertRecordType(type);
        }
        if (type.aliasSymbol && type.aliasSymbol.name === "Partial") {
            return this.convertPartialType(type);
        }
        if (type.aliasSymbol && type.aliasSymbol.name === "Pick") {
            return this.convertPickType(type, typeNode);
        }
        if (symbol.valueDeclaration && ts.isEnumDeclaration(symbol.valueDeclaration)) {
            return this.getEnumType(type, symbol);
        }
        return this.getObjectType(type, this.checker.getPropertiesOfType(type));
    }

    private convertRecordType(type: ts.Type) {
        const keyType = type.aliasTypeArguments && type.aliasTypeArguments[0];
        const valueType = type.aliasTypeArguments && type.aliasTypeArguments[1];

        if (!keyType || !valueType) {
            log("Missing either key or alias type for Record!");
            return null;
        }
        return {
            type: "Record",
            keyType: this.typeToResult(keyType),
            valueType: this.typeToResult(valueType),
        } as RecordType;
    }

    private convertPartialType(type: ts.Type) {
        const keyType = type.aliasTypeArguments && type.aliasTypeArguments[0];

        if (!keyType) {
            log("Missing type parameter for Partial!");
            return null;
        }
        const result = this.typeToResult(keyType);

        if (!result || result.type !== "object") {
            log("Expected Object Parameter for Partial");
            return null;
        }
        Object.values((result as ObjectType).properties).forEach(value => {
            if (value) {
                value.optional = true;
            }
        });
        return result;
    }

    private convertPickType(type: ts.Type, typeNode?: ts.TypeNode) {
        const targetType = type.aliasTypeArguments && type.aliasTypeArguments[0];
        const keysType = type.aliasTypeArguments && type.aliasTypeArguments[1];

        if (!targetType || !keysType) {
            log("Missing target or keys type parameter for Pick!");
            return null;
        }
        if (!keysType.isUnion() && !isStringLiteralType(keysType)) {
            log("Cannot resolve Pick if keystype is not an string or union type");
            return null;
        }
        const result = this.typeToResult(targetType);

        if (!result || result.type !== "object") {
            log("Expected Object Target Parameter for Pick");
            return null;
        }
        const properties = (result as ObjectType).properties;
        const pickedProperties: ObjectProperties = {};

        if (keysType.isUnion()) {
            for (const keyType of keysType.types) {
                if (keyType.isStringLiteral()) {
                    pickedProperties[keyType.value] = properties[keyType.value];
                }
            }
        } else {
            pickedProperties[keysType.value] = properties[keysType.value];
        }
        if (typeNode) {
            (result as ObjectType).name = (typeNode as ts.TypeReferenceNode).typeName.getText();
        }
        return {
            ...result,
            properties: pickedProperties
        } as ObjectType;
    }

    private getFirstTypeNodeArgument(typeNode?: ts.TypeNode): ts.TypeNode | undefined {
        if (typeNode) {
            const typeArguments = (typeNode as ts.NodeWithTypeArguments).typeArguments

            if (typeArguments) {
                return typeArguments[0];
            }
        }
    }

    /**
     * Debugging Code for displaying most information concerning a type itself
     * 
     * @param type type to get info from
     */
    private typeInfo(type: ts.Type): any {
        return {
            type,
            name: this.checker.typeToString(type),
            flags: this.getTypeFlags(type),
            symbolName: type.symbol && this.checker.symbolToString(type.symbol),
            symbolFlags: type.symbol && this.getSymbolFlags(type.symbol),
            getFlags: type.getFlags(),
            getSymbol: type.getSymbol(),
            getProperties: type.getProperties(),
            getApparentProperties: type.getApparentProperties(),
            getCallSignatures: type.getCallSignatures(),
            getConstructSignatures: type.getConstructSignatures(),
            getStringIndexType: type.getStringIndexType(),
            getNumberIndexType: type.getNumberIndexType(),
            getBaseTypes: type.getBaseTypes(),
            getNonNullableType: type.getNonNullableType(),
            getConstraint: type.getConstraint(),
            getDefault: type.getDefault(),
            isUnion: type.isUnion(),
            isIntersection: type.isIntersection(),
            isUnionOrIntersection: type.isUnionOrIntersection(),
            isLiteral: type.isLiteral(),
            isStringLiteral: type.isStringLiteral(),
            isNumberLiteral: type.isNumberLiteral(),
            isTypeParameter: type.isTypeParameter(),
            isClassOrInterface: type.isClassOrInterface(),
            isClass: type.isClass(),
            typeArguments: this.checker.getTypeArguments(type as ts.TypeReference),
            widenedType: this.checker.getWidenedType(type),
            apparentType: this.checker.getApparentType(type),
            defaultFromTypeParameter: this.checker.getDefaultFromTypeParameter(type),
            getBaseConstraintOfType: this.checker.getBaseConstraintOfType(type),
            getAugmentedPropertiesOfType: this.checker.getAugmentedPropertiesOfType(type),
            stringIndexInfoOfType: this.checker.getIndexInfoOfType(type, ts.IndexKind.String),
            numberIndexInfoOfType: this.checker.getIndexInfoOfType(type, ts.IndexKind.Number),
            stringIndexTypeOfType: this.checker.getIndexTypeOfType(type, ts.IndexKind.String),
            numberIndexTypeOfType: this.checker.getIndexTypeOfType(type, ts.IndexKind.Number),
        };
    }

    private getTypeFlags(type: ts.Type): string[] {
        return this.getFlagNames(type.flags, ts.TypeFlags);
    }

    private getSymbolFlags(symbol: ts.Symbol): string[] {
        return this.getFlagNames(symbol.flags, ts.SymbolFlags);
    }

    private getNodeFlags(node: ts.Node): string[] {
        return this.getFlagNames(node.flags, ts.NodeFlags);
    }

    private getFlagNames(current: number, flagEnum: Record<string, number | string>): string[] {
        const flags = [];
        for (const [name, flag] of Object.entries(flagEnum)) {
            if ((Number.isInteger(flag) ? flag as number : Number(flag)) & current) {
                flags.push(name);
            }
        }
        return flags;
    }

    private filterUniqueType(types: TypeResult[]): TypeResult[] {
        for (let i = 0; i < types.length; i++) {
            const type = types[i];

            for (let j = i + 1; j < types.length; j++) {
                const otherType = types[j];

                if (this.equalType(type, otherType)) {
                    types.splice(j, 1);
                    j--;
                }
            }
        }
        return types;
    }

    private equalType(type: TypeResult, other: TypeResult): boolean {
        if (type === other) {
            return true;
        }
        if (!type || !other || type.type !== other.type) {
            return false;
        }
        if (type.type === "object") {
            const subTypes = (type as ObjectType).properties;
            const subOthers = (other as ObjectType).properties;
            const typeKeys = Object.keys(subTypes);
            const otherKeys = Object.keys(subOthers);

            if (typeKeys.length !== otherKeys.length) {
                return false;
            }

            for (let index = 0; index < typeKeys.length; index++) {
                const key = typeKeys[index];
                const otherIndex = otherKeys.findIndex(v => v === key);

                if (otherIndex < 0) {
                    return false;
                }
                otherKeys.splice(otherIndex, 1);

                if (!this.equalType(subTypes[key], subOthers[key])) {
                    return false;
                }
            }
            // if some other keys are left, the types do not match
            return !otherKeys.length;
        }
        if (type.type === "Union") {
            const subTypes = (type as UnionType).unionTypes;
            const subOthers = (other as UnionType).unionTypes;

            for (let index = 0; index < subTypes.length; index++) {
                if (!this.equalType(subTypes[index], subOthers[index])) {
                    return false;
                }
            }
        }
        return true;
    }

    private getEnumType(type: ts.Type, symbol: ts.Symbol): Nullable<EnumType> {
        const enumMember: Record<string, TypeResult> = {};

        for (const member of (type as ts.UnionType).types) {
            const typeResult = this.typeToResult(member);
            const memberName = this.checker.symbolToString(member.symbol);

            if (!typeResult) {
                log(`unable to resolve member type of ${this.checker.symbolToString(symbol)}.${memberName}`);
                return null;
            }
            enumMember[memberName] = typeResult;
        }
        return {
            type: "Enum",
            member: enumMember,
            name: this.checker.typeToString(type),
        } as EnumType;
    }

    /**
     * Checks if the given type is a globally available one.
     * A global member is assumed to be defined in a lib.es*.d.ts file from typescript.
     * 
     * @param type type to check
     */
    private isGlobalMember(type: ts.Type): boolean {
        let node: ts.Node = type.symbol?.valueDeclaration;
        while (node) {
            if (ts.isSourceFile(node)) {
                return node.fileName.match(/.+\/typescript\/lib\/lib\.es.*\.d\.ts/) !== null;
            }
            node = node.parent;
        }
        return false;
    }

    private getObjectType(type: ts.Type, propSymbols: ts.Symbol[]): ObjectType {
        const name = type.symbol?.escapedName || type.aliasSymbol?.escapedName || "";

        if (this.isGlobalMember(type)) {
            return {
                type: "object",
                properties: {},
                name,
                isGlobal: true,
            } as ObjectType;
        }
        // assume a object type
        const properties: ObjectProperties = {};
        for (const value of propSymbols) {
            // for now ignore any function like properties, they should not contribute to openapi
            if (ts.isFunctionLike(value.valueDeclaration)) {
                continue;
            }
            const symbolType = this.checker.getTypeOfSymbolAtLocation(value, value.valueDeclaration);
            const typeResult = this.typeToResult(symbolType);

            if (typeResult) {
                properties[value.getName()] = typeResult;
            }
        }
        return {
            type: "object",
            properties,
            name: name === "__type" ? "" : name,
        } as ObjectType;
    }

    private getSymbol(value: ts.Node) {
        return this.checker.getSymbolAtLocation(value);
    }
}

class Parser {
    private routerVariables: Set<ts.Symbol> = new Set();
    private routerMap: Map<ts.Symbol, RouterEntry> = new Map();
    private routeMap: Map<ts.Symbol, RouteEntry> = new Map();
    private currentlyConvertingRouter: Nullable<ts.Symbol> = null;
    private checker: ts.TypeChecker;
    public functionMap: Map<ts.Symbol, FunctionEntry> = new Map();
    private inferrer: TypeInferrer;

    public constructor(checker: ts.TypeChecker) {
        this.checker = checker;
        this.inferrer = new TypeInferrer(checker);
    }

    public getExpressResult(): ExportExpressResult {
        const result: ExportExpressResult = {};

        for (const [key, functionEntry] of this.functionMap.entries()) {
            // we are interested only in exported router
            if (!functionEntry.exported) {
                continue;
            }
            const name = key.getName();
            // skip anonymous functions
            if (!name) {
                continue;
            }

            if (!functionEntry.returnRouter) {
                functionEntry.returnRouter = this.getReturnRouter(key.valueDeclaration as ts.FunctionDeclaration, null);
            }

            const returnedRouter = functionEntry.returnRouter;

            if (!returnedRouter) {
                log("Exported Function does not return a router: " + name);
                continue;
            }
            const routerEntry = this.routerMap.get(returnedRouter);

            if (!routerEntry) {
                throw Error("No entry available for: " + returnedRouter);
            }
            this.currentlyConvertingRouter = returnedRouter;
            result[name] = this.routerEntryToResult(routerEntry);
        }
        // console.log(JSON.stringify(result, undefined, 2));
        return result;
    }

    private routerEntryToResult(routerEntry: RouterEntry): RouterResult {
        const routerResult: RouterResult = { paths: [], routes: {}, middlewares: [], subRouter: {} };

        for (const [routerPath, functionCallEntry] of Object.entries(routerEntry.subRouter)) {
            const subRouterSymbol = functionCallEntry.returnRouter;

            if (!subRouterSymbol) {
                log("Middleware Function does not return router");
                continue;
            }
            if (subRouterSymbol === this.currentlyConvertingRouter) {
                throw Error("Currently converting Router is recursively a sub router of itself!: " + subRouterSymbol);
            }
            const subRouterEntry = this.routerMap.get(subRouterSymbol);

            if (!subRouterEntry) {
                throw Error("Sub router as no entry: " + subRouterSymbol);
            }
            routerResult.subRouter[routerPath] = this.routerEntryToResult(subRouterEntry);
        }
        for (const [routePath, route] of Object.entries(routerEntry.routes)) {
            const routeResult: RouteResult = routerResult.routes[routePath] = {};

            for (const [method, middleware] of Object.entries(route)) {
                routeResult[method] = this.middlewareToResult(middleware);
            }
        }
        for (const pathEntry of routerEntry.paths) {
            routerResult.paths.push({
                path: pathEntry.path,
                // @ts-expect-error
                method: pathEntry.method,
                middleware: this.middlewareToResult(pathEntry.middleware)
            });
        }
        routerResult.middlewares = routerEntry.middlewares.map((value) => this.middlewareToResult(value));
        return routerResult;
    }

    /**
     * Creates a StackElement for a call stack.
     * Returns null if node is falsy or does not have a symbol.
     * 
     * @param signature 
     * @param node 
     */
    private createStackElement(signature: SignatureDeclaration, node?: ts.Node): Nullable<StackElement> {
        if (!node) {
            return null;
        }
        const symbol = this.getSymbol(node);
        return !symbol ? null : {
            signature,
            symbol,
            arguments: [],
            isGlobal: this.hasOuterFunction(signature)
        };
    }

    private middlewareToResult(middleware: Middleware): MiddlewareResult {
        const middlewareSymbol = this.checker.getSymbolAtLocation(middleware);

        const middlewareResult: MiddlewareResult = { returnTypes: {} };
        if (!middlewareSymbol) {
            return middlewareResult;
        }
        const valueDeclaration = middlewareSymbol.valueDeclaration;
        let stackElement: Nullable<StackElement> = null;

        if (ts.isVariableDeclaration(valueDeclaration)) {
            const initializer = valueDeclaration.initializer;
            if (!initializer) {
                return middlewareResult;
            }
            if (ts.isFunctionLike(initializer)) {
                stackElement = this.createStackElement(initializer, valueDeclaration.name);
            } else if (ts.isIdentifierOrPrivateIdentifier(initializer)) {
                // TODO: 10.08.2020 middleware aliases like putProgress
                return this.middlewareToResult(initializer);
            } else {
                return middlewareResult;
            }
        } else if (ts.isFunctionDeclaration(valueDeclaration)) {
            stackElement = this.createStackElement(valueDeclaration, valueDeclaration.name);
        } else {
            return middlewareResult;
        }
        if (!stackElement) {
            return middlewareResult;
        }
        const container: SearchContainer = {
            middlewareResult,
            callStack: [],
            middleware,
            requestInfo: { bodyParams: {}, queryParams: {} },
            responseInfo: {},
            currentStackElement: stackElement
        };

        this.searchMiddlewareStack(container);
        middlewareResult.queryType = container.requestInfo.queryParams;
        middlewareResult.bodyType = container.requestInfo.bodyParams;
        middlewareResult.returnTypes = {};

        for (const [code, response] of Object.entries(container.responseInfo)) {
            if (response.body) {
                middlewareResult.returnTypes[Number(code)] = response.body;
            }
        }
        log(`Middleware ${middleware.getText()} has no returnType: ${middlewareResult.returnTypes == null}`)
        return middlewareResult;
    }

    /**
     * Extract Informations about the what a possible Request
     * going through this Middleware would require and what it would deliver.
     * 
     * @param container a container for storing information and the result
     */
    private searchMiddlewareStack(container: SearchContainer): void {
        const middlewareSignature = container.currentStackElement.signature;
        const currentFunctionSymbol = container.currentStackElement.symbol;

        // prevent infinite recursion
        if (container.callStack.find((value) => value.symbol === currentFunctionSymbol)) {
            log("Recursive call of: " + middlewareSignature.getText());
            return;
        }
        container.callStack.push(container.currentStackElement);
        const parameterSymbols = middlewareSignature.parameters
            .map((value) => this.getSymbol(value.name))
            .filter((value) => value) as ts.Symbol[];

        const requestParamSymbol = parameterSymbols.find((value) => {
            const typeSymbol = this.checker.getTypeOfSymbolAtLocation(value, value.valueDeclaration).getSymbol();
            return typeSymbol && typeSymbol.name === "Request";
        });

        const responseParamSymbol = parameterSymbols.find((value) => {
            const typeSymbol = this.checker.getTypeOfSymbolAtLocation(value, value.valueDeclaration).getSymbol();
            return typeSymbol && typeSymbol.name === "Response";
        });

        if (!requestParamSymbol && !responseParamSymbol) {
            log(
                "Faulty Function: Missing either Request and Response Parameter: " + container.middleware.getText()
            );
            return;
        }
        container.currentStackElement.requestSymbol = requestParamSymbol;
        container.currentStackElement.responseSymbol = responseParamSymbol;

        let functionStatements: Nullable<Readonly<Statement[]>> = null;

        if (ts.isArrowFunction(middlewareSignature)) {
            const body = middlewareSignature.body;
            if (ts.isBlock(body)) {
                functionStatements = body.statements;
            } else {
                this.searchMiddlewareStatement(body, container);
            }
        } else if ((ts.isFunctionDeclaration(middlewareSignature)
            || ts.isFunctionExpression(middlewareSignature)) && middlewareSignature.body) {
            functionStatements = middlewareSignature.body.statements;
        }
        if (functionStatements) {
            for (const statement of functionStatements) {
                this.searchMiddlewareStatement(statement, container);
            }
        }
    }

    /**
     * Searches in the Statement/Node about possible uses of a
     * request and/or response variable. 
     * 
     * @param body 
     * @param container 
     */
    private searchMiddlewareStatement(body: ts.Node, container: SearchContainer) {
        // search for all property accesses which contain the request variable
        const requestAccesses = getChildrenThat(body, (t) => {
            if (ts.isPropertyAccessExpression(t)) {
                if (t.expression.kind !== SyntaxKind.Identifier) {
                    return false;
                }
                // the value whose property will be accessed
                const valueSymbol = this.checker.getSymbolAtLocation(t.expression);
                return valueSymbol === container.currentStackElement.requestSymbol;
            } else {
                return false;
            }
        }) as PropertyAccessExpression[];

        for (const requestAccess of requestAccesses) {
            const propertyIdentifier = requestAccess.name;

            if (propertyIdentifier.text === "query") {
                const queryProperties = this.getPropertyAccess(requestAccess, container);

                if (queryProperties.length) {
                    for (const queryProperty of queryProperties) {
                        // TODO: 10.08.2020 infer type for query
                        container.requestInfo.queryParams[queryProperty] = {
                            type: "any"
                        };
                    }
                } else {
                    log("unknown request.query property: " + requestAccess.getText());
                }
            } else if (propertyIdentifier.text === "body") {
                const queryProperties = this.getPropertyAccess(requestAccess, container);

                if (queryProperties.length) {
                    for (const queryProperty of queryProperties) {
                        // TODO: 10.08.2020 infer type for query
                        container.requestInfo.bodyParams[queryProperty] = {
                            type: "any"
                        };
                    }
                } else {
                    log("unknown request.body property: " + requestAccess.getText());
                }
            }
        }

        // search for all property accesses which contain the request variable
        const callsOnResponse = getChildrenThat(body, (t) => {
            if (ts.isCallExpression(t)) {
                return ts.isPropertyAccessExpression(t.expression)
                    && this.isSymbol(t.expression.expression, container.currentStackElement.responseSymbol);
            } else {
                return false;
            }
        }) as CallExpression[];

        for (let callExpression of callsOnResponse) {
            // there may be a chain call on response variable
            // so go from innermost callexpression to outermost callexpression
            while (callExpression && ts.isCallExpression(callExpression)) {
                const identifier = getFirstCallIdentifier(callExpression);

                if (!identifier) {
                    log("No Identifier for Response.method: " + callExpression.getText());
                    break;
                }
                this.processResponseCall(callExpression, identifier.text, container);
                callExpression = callExpression.parent?.parent as ts.CallExpression;
            }
        }

        const callsWithEitherReqOrRes = getChildrenThat(body, (t) => {
            if (ts.isCallExpression(t)) {
                for (const argument of t.arguments) {
                    if (ts.isIdentifierOrPrivateIdentifier(argument)) {
                        return this.isSymbol(argument, container.currentStackElement.requestSymbol)
                            || this.isSymbol(argument, container.currentStackElement.responseSymbol);
                    }
                }
            }
            return false;
        }) as CallExpression[];

        for (const callExpression of callsWithEitherReqOrRes) {
            if (ts.isIdentifierOrPrivateIdentifier(callExpression.expression)) {
                const callSymbol = this.checker.getSymbolAtLocation(callExpression.expression);
                if (!callSymbol) {
                    log("No Symbol for Call: " + callExpression.expression.getText());
                    continue;
                }
                const declaration = callSymbol.valueDeclaration;
                if (!ts.isFunctionLike(declaration)) {
                    log(
                        "Value Declaration of Call Symbol is no SignatureDeclaration: "
                        + callExpression.expression.getText()
                    );
                    continue;
                }
                const currentStackElement = this.createStackElement(declaration, declaration.name);

                if (!currentStackElement) {
                    continue;
                }
                // add to call stack and update current stack
                currentStackElement.arguments.push(...callExpression.arguments);
                container.currentStackElement = currentStackElement;

                this.searchMiddlewareStack(container);

                // remove from call stack and set current stack to last stack element
                container.callStack.pop();
                container.currentStackElement = container.callStack[container.callStack.length - 1];
            }
        }
    }

    private hasOuterFunction(func: ts.Node): boolean {
        return !hasParentThat(func, (node) => ts.isFunctionLike(node));
    }

    private isSymbol(node: ts.Node, symbol?: ts.Symbol): boolean {
        return !!symbol && this.getSymbol(node) === symbol;
    }

    private isInErrorBlock(node: ts.Node): boolean {
        let target = node;
        let end = false;
        let errorBlock = false
        let previousTarget = node;

        while (!end && target) {
            if ((ts.isCallExpression(target) && this.getCalledName(target) === "catch" && target.arguments.includes(previousTarget as ts.Expression)) || ts.isCatchClause(target)) {
                end = true;
                errorBlock = true;
                // for now just stop at the first parent function declaration
            } else if (ts.isFunctionDeclaration(target)) {
                end = true;
            }
            previousTarget = target;
            target = target.parent;
        }
        return errorBlock;
    }

    private getCalledName(node: ts.CallExpression): string {
        if (ts.isPropertyAccessExpression(node.expression)) {
            return node.expression.name.getText();
        }
        return "";
    }

    private processResponseCall(callExpression: CallExpression, methodName: string, container: SearchContainer) {
        const responseInfo: ResponseInfo = { header: {}, body: null };
        const isInErrorBlock = this.isInErrorBlock(callExpression);
        // default statuscode
        const statusCode = isInErrorBlock ? 400 : 200;

        if (methodName === "append") {
            // by Express v4.11.0+
            const headerKey = callExpression.arguments[0];
            const headerValue = callExpression.arguments[1];

            if (!headerKey || !ts.isStringLiteralLike(headerKey)) {
                log("expected string literal as header key: " + callExpression.getText());
                return;
            }
            let value = null;

            // TODO: 10.08.2020 accept string array also
            if (headerValue) {
                if (!ts.isStringLiteralLike(headerValue)) {
                    log("expected string literal as header key: " + callExpression.getText());
                    return;
                } else {
                    value = headerValue.text;
                }
            }
            responseInfo.header[headerKey.text] = value;
        } else if (methodName === "attachment") {
            const fileName = callExpression.arguments[0];
            // TODO: 10.08.2020 for Content-Disposition header
        } else if (methodName === "cookie") {
            // set Set-Cookie header
            const cookieName = callExpression.arguments[0];
            const cookieValue = callExpression.arguments[1];
            const cookieOptions = callExpression.arguments[2];
            // TODO: 10.08.2020 add cookies to header
        } else if (methodName === "clearCookie") {
            // TODO: 10.08.2020 ignore this?
        } else if (methodName === "download") {
            // optional options argument is supported by Express v4.16.0 onwards.
            const path = callExpression.arguments[0];
            const filename = callExpression.arguments[1];
            // same options as sendFile
            const options = callExpression.arguments[2];
            // TODO: 10.08.2020 transfers file as attachment, sets Content-Disposition
        } else if (methodName === "end") {
            // used to end response without sending data (body), only header?
            const data = callExpression.arguments[0];
            const encoding = callExpression.arguments[1];
        } else if (methodName === "format") {
            // for content-negotiation on the 'Accept' Header
            const object = callExpression.arguments[0];
        } else if (methodName === "get") {
            // *.get the headerValue of response
            const headerKey = callExpression.arguments[0];
            // TODO: 10.08.2020 ignore this?
        } else if (methodName === "json") {
            // optional body, send object after JSON.stringify-ing it (afterwards it is send automatically)
            const body = callExpression.arguments[0];
            responseInfo.body = this.inferrer.inferNodeType(body, container.currentStackElement);
        } else if (methodName === "jsonp") {
            // optional body, send object after JSON.stringify-ing it (afterwards it is send automatically)
            // the body is wrapped in a function call (used in tandem with <script lang="ts">), by default 'callback'
            const body = callExpression.arguments[0];
        } else if (methodName === "links") {
            // populates the 'Links' header
            const links = callExpression.arguments[0];
        } else if (methodName === "location") {
            // populates the 'Location' header
            const path = callExpression.arguments[0];
        } else if (methodName === "redirect") {
            // redirects to url specified by path, by default statusCode 302
            // path can be absolute, relative to root of host url, relative to current url
            // a 'back' redirection directs to 'referrer' header
            const statusOrPath = callExpression.arguments[0];
            const path = callExpression.arguments[1];
        } else if (methodName === "render") {
            // TODO: 11.08.2020 ignore for now
        } else if (methodName === "send") {
            // can be buffer, string, object or array
            // automatically assigns 'Content-Length' if n.d.,
            // provides automatic 'HEAD' and 'HTTP' Cache freshness support
            // when buffer: sets 'Content-Type' to 'application/octet-stream' if n.d.
            // when string: sets 'Content-Type' to 'text/html' if n.d.
            const data = callExpression.arguments[0];
        } else if (methodName === "sendFile") {
            //  by Express v4.8.0 onwards
            // Sets the Content-Type response HTTP header field based on the filename’s extension
            // TODO: 11.08.2020 ignore for now
        } else if (methodName === "sendStatus") {
            // set status and sends it immediately equivalent to *.status(xxx).send(statusMsg)
            const code = callExpression.arguments[0];
        } else if (methodName === "set") {
            // set header, either as key, key-value or object of key-values
            const headerKey = callExpression.arguments[0];
            const headerValue = callExpression.arguments[1];
        } else if (methodName === "status") {
            // set status code of response
            const code = callExpression.arguments[0];
        } else if (methodName === "type") {
            // sets 'Content-Type' to type via node-mime package
            const type = callExpression.arguments[0];
        } else if (methodName === "vary") {
            // adds field to vary response header?
            const type = callExpression.arguments[0];
        } else {
            // or a call of a super type of express.Response like http.ServerResponse or http.OutgoingMessage
            log("Unknown call on response: " + callExpression.getText());
        }
        if (container.responseInfo[statusCode] && container.responseInfo[statusCode].body) {
            // TODO: check really if same status code
            // merge if it is
            log("Response exists already!");
        } else {
            container.responseInfo[statusCode] = responseInfo;
        }
    }

    private getPropertyAccess(node: ts.Node, container: SearchContainer): string[] {
        const parent = node.parent;

        if (ts.isElementAccessExpression(parent)) {
            const keyNode = parent.argumentExpression;
            const value = this.getStringLiteralValue(keyNode, container);
            return value ? [value] : [];
        } else if (ts.isPropertyAccessExpression(parent)) {
            return [parent.name.text];
        } else if (ts.isVariableDeclaration(parent) && ts.isObjectBindingPattern(parent.name)) {
            // TODO: 10.08.2020 more complex destructuring
            // assume simple destructuring: {a, b} = value
            return parent.name.elements.map((value) => value.name.getText());
        }
        return [];
    }

    private getStringLiteralValue(node: ts.Node, container: SearchContainer, stackLevel?: number): Nullable<string> {
        if (stackLevel == null) {
            stackLevel = container.callStack.length - 1;
        }
        if (stackLevel < 0) {
            return null;
        }
        const stackElement = container.callStack[stackLevel];

        if (ts.isStringLiteralLike(node)) {
            return node.text;
        } else if (ts.isIdentifier(node)) {
            const keySymbol = this.getSymbol(node);

            if (!keySymbol) {
                log("cannot find symbol for ElementAccess of: " + node.parent.getText());
                return null;
            }
            if (ts.isParameter(keySymbol.valueDeclaration)) {
                const parameterIndex = stackElement.signature.parameters.indexOf(keySymbol.valueDeclaration);
                const argument = stackElement.arguments[parameterIndex];

                if (!argument) {
                    return null;
                }
                return this.getStringLiteralValue(argument, container, stackLevel - 1);
            } else {
                log("Unknown node type, not a parameter: " + keySymbol.valueDeclaration.getText());
            }
            // TODO: 10.08.2020 try to infer from variableDeclaration
        } else {
            log("unknown node: neither StringLiteral or Identifier: " + node.getText());
        }
        return null;
    }

    private getReturnRouter(outerFunction: ts.FunctionDeclaration,
        variableSymbol: Nullable<ts.Symbol>): Optional<ts.Symbol> {
        if (!outerFunction.body) {
            return;
        }
        const returnNodes = filterKind(outerFunction.body.statements, SyntaxKind.ReturnStatement)
            .filter((value) => {
                const identifier = getFirst(value, SyntaxKind.Identifier);
                if (!identifier) {
                    return false;
                }
                const identifierSymbol = this.checker.getSymbolAtLocation(identifier);
                return identifierSymbol
                    && (this.routerVariables.has(identifierSymbol)
                        || identifierSymbol === variableSymbol);
            });
        if (returnNodes.length > 1) {
            log("more than one return router statement");
        } else if (returnNodes.length === 1) {
            const lastReturn = returnNodes.pop() as ts.Node;
            const routerIdentifier = getFirst(lastReturn, SyntaxKind.Identifier) as ts.Node;
            return this.checker.getSymbolAtLocation(routerIdentifier) as ts.Symbol;
        } else {
            log("No Router returned for function: " + outerFunction.getText());
        }
    }

    /**
     * Inspect a Variable Declaration for Declarations
     * of a Route or Router.
     * 
     * @param node the variable declaration to inspect
     */
    public inspectVariableDeclaration(node: ts.VariableDeclaration) {
        const initializer = node.initializer;
        if (!initializer) {
            return;
        }
        const firstCallIdentifier = getFirstCallIdentifier(initializer);
        // check if the right side of the declaration is a router creation call
        if (firstCallIdentifier) {
            const symbol = this.checker.getSymbolAtLocation(firstCallIdentifier);
            if (symbol) {
                if (symbol.getName() === "Router") {
                    const outerFunction = getFirstParent(
                        node,
                        ts.SyntaxKind.FunctionDeclaration
                    ) as ts.FunctionDeclaration;
                    const variableSymbol = this.checker.getSymbolAtLocation(node.name) as ts.Symbol;
                    const outerFunctionSymbol = this.checker.getSymbolAtLocation(outerFunction.name as Identifier);

                    if (!outerFunctionSymbol) {
                        log("Missing Symbol for outer Function: " + outerFunction.getText());
                        return;
                    }
                    const functionEntry = this.getFunctionEntry(outerFunctionSymbol);
                    functionEntry.router.push(variableSymbol);
                    functionEntry.exported = isNodeExported(outerFunction);
                    functionEntry.returnRouter = this.getReturnRouter(outerFunction, variableSymbol);

                    this.routerVariables.add(variableSymbol);
                } else if (symbol.getName() === "route") {
                    const routerIdentifier = getFirst(initializer, ts.SyntaxKind.Identifier) as Identifier;
                    const routerSymbol = this.checker.getSymbolAtLocation(routerIdentifier);

                    if (!routerSymbol) {
                        log("No Symbol for Router Variable at position: " + routerIdentifier.pos);
                        return;
                    }
                    const call = getFirst(initializer, SyntaxKind.CallExpression) as CallExpression;
                    if (call.arguments.length !== 1) {
                        log("Require exactly on argument for method 'route' on position: " + call.pos);
                        return;
                    } else {
                        const expression = call.arguments[0];
                        const routerEntry = this.getRouterEntry(routerSymbol);
                        const variableSymbol = this.checker.getSymbolAtLocation(node.name) as ts.Symbol;

                        if (ts.isStringLiteral(expression)) {
                            const routePath = expression.text;
                            routerEntry.routes[routePath] = this.getRouteEntry(variableSymbol);
                        } else {
                            log("Require string literal as path for method 'route' on position: " + call.pos);
                        }
                    }
                } else {
                    log(`Unknown Call Symbol for ${symbol.getName()}`);
                }
            } else {
                log(`No Symbol for ${node.getText()}`);
            }
        }
    }

    private processRouter(propertyName: ts.Identifier | ts.PrivateIdentifier, node: ts.Node,
        variableSymbol: ts.Symbol, variableIdentifier: ts.LeftHandSideExpression) {
        const name = propertyName.text;
        const parameterList = getFirst(node, ts.SyntaxKind.SyntaxList) as SyntaxList;

        if (isHttpMethod(name)) {
            if (!parameterList) {
                log("No Parameter for Http method call!");
                return;
            }
            const pathLiteral = parameterList.getChildAt(0) as StringLiteral;
            const middleWareNode = parameterList.getChildAt(2);

            const routerEntry = this.getRouterEntry(variableSymbol);
            routerEntry.paths.push({
                path: pathLiteral.text,
                middleware: middleWareNode,
                method: name
            });
        } else if (name.toLowerCase() === "use") {
            this.processUseMiddleware(parameterList, variableIdentifier, variableSymbol, node);
        } else {
            log(`Non http Method call: ${name}() on ${variableIdentifier.getText()}`);
        }
    }

    /**
     * Process the Arguments of a <router>.use(*) Call.
     * 
     * @param parameterList 
     * @param variableIdentifier 
     * @param variableSymbol 
     * @param node 
     */
    private processUseMiddleware(parameterList: ts.SyntaxList, variableIdentifier: ts.LeftHandSideExpression, variableSymbol: ts.Symbol, node: ts.Node) {
        if (!parameterList) {
            log(`No Middleware supplied to ${variableIdentifier.getText()}.use!`);
            return;
        }
        // if only a single parameter is available, it is most likely a middleware function
        if (parameterList.getChildCount() === 1) {
            const middleWareNode = parameterList.getChildAt(0);
            const routerEntry = this.getRouterEntry(variableSymbol);
            routerEntry.middlewares.push(middleWareNode);
            // if parameter list has 3 children: 'path', ',', 'middleware'
        } else if (parameterList.getChildCount() === 3) {
            const pathLiteral = parameterList.getChildAt(0);

            if (ts.isStringLiteral(pathLiteral)) {
                const middleWareNode = parameterList.getChildAt(2);
                const nextCall = getFirst(middleWareNode, ts.SyntaxKind.CallExpression);

                const routerEntry: RouterEntry = this.getRouterEntry(variableSymbol);
                // type of *.use("my-path", functionReturninARouter())
                if (nextCall && ts.isCallExpression(nextCall)) {
                    const callIdentifier = getFirstCallIdentifier(nextCall);

                    if (callIdentifier) {
                        const functionSymbol = this.checker.getSymbolAtLocation(callIdentifier);
                        if (functionSymbol) {
                            const functionEntry = this.getFunctionEntry(functionSymbol);
                            const text = pathLiteral.text;
                            const subRouter = routerEntry.subRouter;
                            subRouter[text] = functionEntry;
                        } else {
                            log("No Function symbol for: " + callIdentifier.getText());
                        }
                    } else {
                        log("No Call Identifier for Call Expression: " + nextCall.getText());
                    }
                } else if (isIdentifier(middleWareNode)) {
                    const routerSymbol = this.getSymbol(middleWareNode);
                    // if multiple router are declared in the same function
                    // emulate as if it were declared in a own function
                    if (routerSymbol && this.routerVariables.has(routerSymbol)) {
                        routerEntry.subRouter[pathLiteral.text] = {
                            exported: false,
                            router: [routerSymbol],
                            returnRouter: routerSymbol
                        };
                    } else {
                        log("Expected a Symbol: " + middleWareNode.getText());
                    }
                } else {
                    log("Router.use where second argument is not a router:" + node.getText());
                }
            } else {
                log("Expected a string literal as path: " + node.getText());
            }
        } else {
            log(`Not exactly one or two Arguments supplied to *.use!: ${node.getText()}`);
        }
    }

    private processRoute(propertyName: ts.Identifier | ts.PrivateIdentifier, node: ts.Node,
        variableSymbol: ts.Symbol, variableIdentifier: ts.LeftHandSideExpression) {
        const name = propertyName.text;
        const parameterList = getFirst(node, ts.SyntaxKind.SyntaxList) as SyntaxList;
        if (isHttpMethod(name)) {
            if (!parameterList) {
                log("No Parameter for Http method call!");
                return;
            }
            const middleWareNode = parameterList.getChildAt(0);

            const routeEntry = this.getRouteEntry(variableSymbol);
            routeEntry[name] = middleWareNode;
        } else {
            log(`Non http Method call: ${name}() on ${variableIdentifier.getText()}`);
        }
    }

    public inspectCall(node: ts.Node) {
        const propertyAccess = getFirst(
            node,
            ts.SyntaxKind.PropertyAccessExpression
        ) as PropertyAccessExpression;

        // if there is a property access, assume a method is called with 'identifier.method()'
        if (propertyAccess) {
            const variableIdentifier = propertyAccess.expression;
            const propertyName = propertyAccess.name;
            const variableSymbol = this.checker.getSymbolAtLocation(variableIdentifier);

            if (!variableSymbol) {
                log("Variable Property Access has no Symbol: " + node.getText());
                return;
            }
            if (this.routerVariables.has(variableSymbol)) {
                this.processRouter(propertyName, node, variableSymbol, variableIdentifier);
            } else if (this.routeMap.has(variableSymbol)) {
                this.processRoute(propertyName, node, variableSymbol, variableIdentifier);
            } else {
                log("Unknown Method Call: " + node.getText());
            }
        } else {
            const firstIdentifier = getFirst(node, ts.SyntaxKind.Identifier);

            if (firstIdentifier) {
                const symbol = this.checker.getSymbolAtLocation(firstIdentifier);

                if (symbol) {
                    log(`${ts.SyntaxKind[node.kind]}: Call ${node.getFullText()}`);
                } else {
                    log(`No Symbol for ${firstIdentifier.getText()}`);
                }
            }
        }
    }

    private getSymbol(value: ts.Node) {
        return this.checker.getSymbolAtLocation(value);
    }

    private getFunctionEntry(symbol: ts.Symbol): FunctionEntry {
        return getOrInit(this.functionMap, symbol, () => {
            return {
                exported: false,
                router: []
            } as FunctionEntry;
        });
    }

    private getRouterEntry(symbol: ts.Symbol): RouterEntry {
        return getOrInit(this.routerMap, symbol, () => {
            return { routes: {}, middlewares: [], paths: [], subRouter: {} } as RouterEntry;
        });
    }

    private getRouteEntry(symbol: ts.Symbol): RouteEntry {
        return getOrInit(this.routeMap, symbol, () => {
            return {} as RouteEntry;
        });
    }

    /** Serialize a symbol into a json object */
    private serializeSymbol(symbol: ts.Symbol): DocEntry {
        return {
            name: symbol.getName(),
            documentation: ts.displayPartsToString(symbol.getDocumentationComment(this.checker)),
            type: this.checker.typeToString(
                this.checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration)
            )
        };
    }

    /** Serialize a class symbol information */
    private serializeClass(symbol: ts.Symbol) {
        const details = this.serializeSymbol(symbol);

        // Get the construct signatures
        const constructorType = this.checker.getTypeOfSymbolAtLocation(
            symbol,
            symbol.valueDeclaration
        );
        details.constructors = constructorType
            .getConstructSignatures()
            .map((value) => this.serializeSignature(value));
        return details;
    }

    /** Serialize a signature (call or construct) */
    private serializeSignature(signature: ts.Signature) {
        return {
            parameters: signature.parameters.map((value) => this.serializeSymbol(value)),
            returnType: this.checker.typeToString(signature.getReturnType()),
            documentation: ts.displayPartsToString(signature.getDocumentationComment(this.checker))
        };
    }
}

/** True if this is visible outside this file, false otherwise */
function isNodeExported(node: ts.Node): boolean {
    return (
        (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0
        // || (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile)
    );
}

const httpMethods = ["post", "get", "put", "delete"];

function isHttpMethod(name: string): boolean {
    return httpMethods.includes(name.toLowerCase());
}

function getOrInit<K, V>(map: Map<K, V>, key: K, value: () => V) {
    const v = map.get(key);

    if (v) {
        return v;
    } else {
        const newV = value();
        map.set(key, newV);
        return newV;
    }
}

function indexOf<T>(items: T[], found: (t: T) => boolean) {
    for (let i = 0; i < items.length; i++) {
        if (found(items[i])) {
            return i;
        }
    }
    return -1;
}

function getFirstCallIdentifier(node: ts.Node): Nullable<ts.Identifier> {
    const firstCall = getFirst(node, ts.SyntaxKind.CallExpression);
    if (!firstCall) {
        return null;
    } else {
        return getFirstChildThat(firstCall, (t) => {
            if (SyntaxKind.Identifier !== t.kind) {
                return false;
            }
            const nextSib = nextNode(t);
            return nextSib != null && nextSib.kind === SyntaxKind.OpenParenToken;
        }) as any;
    }
}

function getFirstParent(node: ts.Node, kind: ts.SyntaxKind): Nullable<ts.Node> {
    let parent = node.parent;
    while (parent) {
        if (parent.kind === kind) {
            return parent;
        }
        parent = parent.parent;
    }
    return null;
}

function hasParentThat(node: ts.Node, predicate: (node: ts.Node) => boolean): boolean {
    let parent = node.parent;
    while (parent) {
        if (predicate(parent)) {
            return true;
        }
        parent = parent.parent;
    }
    return false;
}

function isIdentifier(value: ts.Node): value is ts.Identifier {
    return value.kind === ts.SyntaxKind.Identifier;
}
type BooleanLiteralType = ts.Type & { flags: ts.TypeFlags.BooleanLiteral };

function isNumberLiteralType(value: ts.Type): value is ts.NumberLiteralType {
    return !!(value.flags & ts.TypeFlags.NumberLiteral);
}

function isBooleanLiteralType(value: ts.Type): value is BooleanLiteralType {
    return !!(value.flags & ts.TypeFlags.BooleanLiteral);
}

function isStringLiteralType(value: ts.Type): value is ts.StringLiteralType {
    return !!(value.flags & ts.TypeFlags.StringLiteral);
}

function isEnumLikeType(value: ts.Type): boolean {
    return !!(value.flags & ts.TypeFlags.EnumLike);
}


function nextNode(node: ts.Node): Nullable<ts.Node> {
    if (!node.parent) {
        return null;
    }
    const children = node.parent.getChildren();
    const index = children.indexOf(node);

    const nextIndex = index + 1;
    // if index is greater or equal to last index, next Node is the earliest node of its parents next node
    // assume that it is in parent.getChildren()
    if (nextIndex >= children.length) {
        // get the next node for the parent and look for the earliest node
        let earliestNode = nextNode(node.parent);

        while (earliestNode && earliestNode.getChildCount()) {
            earliestNode = earliestNode.getChildAt(0);
        }
        return earliestNode;
    }
    return node.parent.getChildAt(nextIndex);
}

function getChildrenThat(node: ts.Node, found: (t: ts.Node) => boolean): ts.Node[] {
    const thatChildren = node.getChildren().filter(found);

    for (const child of node.getChildren()) {
        const result = getChildrenThat(child, found);
        thatChildren.push(...result);
    }
    return thatChildren;
}

function getFirstChildThat(node: ts.Node, found: (t: ts.Node) => boolean): Nullable<ts.Node> {
    const index = indexOf(node.getChildren(), found);

    if (index >= 0) {
        return node.getChildAt(index);
    }
    for (const child of node.getChildren()) {
        const result = getFirstChildThat(child, found);

        if (result) {
            return result;
        }
    }
    return null;
}

function filterKind(nodes: ts.Node[] | readonly ts.Node[], kind: ts.SyntaxKind): ts.Node[] {
    return nodes.filter((value) => value.kind === kind);
}

function getFirst(node: ts.Node, kind: ts.SyntaxKind): Nullable<ts.Node> {
    if (node.kind === kind) {
        return node;
    }
    for (const child of node.getChildren()) {
        const result = getFirst(child, kind);

        if (result) {
            return result;
        }
    }
    return null;
}

function transformToOpenApi(expressApi: ExportExpressResult): OpenApiObject {
    const keys = Object.keys(expressApi);

    const paths: PathsObject = {};

    if (keys.length) {
        const [first] = keys;
        const apiElement = expressApi[first];
        routerResultToOpenApi(apiElement, paths);
    }
    return {
        openapi: "3.0.0",
        info: {
            title: "Enterprise",
            version: "1.0"
        },
        paths,
    };
}
/**
 * HTTP Methods which require (or can be used) a Request body.
 * All other Methods are assumed to get their parameter via query string.
 */
const bodyMethods = ["post", "put", "patch"];

function routerResultToOpenApi(router: RouterResult, paths: PathsObject, absolutePath = "/", parentParameters = {}) {
    const requestObject: RequestBodyObject = {
        content: {}
    };
    const genericParameters: Record<string, null> = {
        ...parentParameters
    };

    for (const middleware of router.middlewares) {
        if (middleware.bodyType) {
            Object.assign(genericParameters, middleware.bodyType);
        }
        if (middleware.queryType) {
            Object.assign(genericParameters, middleware.queryType);
        }
    }
    const contentCopyString = JSON.stringify(requestObject.content);

    for (const routerPath of router.paths) {
        const currentPath = normalizePath(absolutePath + routerPath.path);
        const pathObject: PathItemObject = paths[currentPath] ? paths[currentPath] : (paths[currentPath] = {});
        const pathRequestObject: RequestBodyObject = {
            content: JSON.parse(contentCopyString)
        };
        const middleware = routerPath.middleware;
        const operation = setPathObject(middleware, routerPath.method, pathRequestObject, genericParameters);
        pathObject[routerPath.method] = operation;
    }

    for (const [pathKey, routeValue] of Object.entries(router.routes)) {
        const currentPath = normalizePath(absolutePath + pathKey);
        const pathObject: PathItemObject = paths[currentPath] ? paths[currentPath] : (paths[currentPath] = {});

        for (const [method, middleware] of Object.entries(routeValue)) {
            const routeRequestObject: RequestBodyObject = {
                content: JSON.parse(contentCopyString)
            };

            const operation = setPathObject(middleware, method, routeRequestObject, genericParameters);
            // @ts-expect-error
            pathObject[method] = operation;
        }
    }
    const parentRouter = router as ParentRouterResult;
    parentRouter.path = absolutePath;

    for (const [pathKey, subRouter] of Object.entries(router.subRouter)) {
        const subPath = normalizePath(absolutePath + pathKey);
        routerResultToOpenApi(subRouter, paths, subPath, genericParameters);
    }
}

function setPathObject(middleware: MiddlewareResult, method: string, request: RequestBodyObject, genericParams: Record<string, null>): OperationObject {
    const hasBodyParams = middleware.bodyType && !isEmpty(middleware.bodyType);
    const hasQueryParams = middleware.queryType && !isEmpty(middleware.queryType);
    const pathParameters: ParameterObject[] = [];

    if (hasBodyParams) {
        setRequestBody(request, genericParams, middleware.bodyType as Record<string, TypeResult>);
    }
    if (hasQueryParams) {
        setRequestQuery(method, pathParameters, genericParams, middleware.queryType as Record<string, TypeResult>);
    }

    // if no parameters are required by this middleware itself, but from a parent middleware
    if (!hasBodyParams && !hasQueryParams && Object.keys(genericParams).length) {
        const lowerMethod = method.toLowerCase();

        if (bodyMethods.includes(lowerMethod)) {
            setRequestBody(request, genericParams, {});
        } else {
            for (const queryTypeKey of Object.keys(genericParams)) {
                pathParameters.push({
                    in: "query",
                    name: queryTypeKey,
                });
            }
        }
    }

    return {
        parameters: pathParameters,
        requestBody: request,
        responses: toResponses(middleware.returnTypes),
    } as OperationObject;
}

function setRequestBody(pathRequestObject: RequestBodyObject, genericParameters: Record<string, null>, bodyType: Record<string, TypeResult>): void {
    pathRequestObject.content["application/json"] = {
        schema: {
            type: "object",
            properties: {
                // let generic parameter be overwritten from this one
                ...genericParameters,
                ...bodyType
            },
        }
    } as MediaTypeObject;
}

function setRequestQuery(method: string, parameter: ParameterObject[], genericParameters: Record<string, null>, queryType: Record<string, TypeResult>): void {
    if (bodyMethods.includes(method)) {
        log("Query Parameter supplied in a Body Method!");
    }
    for (const queryTypeKey of Object.keys(genericParameters)) {
        parameter.push({
            in: "query",
            name: queryTypeKey,
        });
    }
    for (const queryTypeKey of Object.keys(queryType)) {
        const index = parameter.findIndex(value => value.name === queryTypeKey);

        // remove any possible generic parameter which is a duplicate of this one
        if (index >= 0) {
            parameter.splice(index, 1);
        }

        parameter.push({
            in: "query",
            name: queryTypeKey,
        });
    }
}

function toResponses(returnTypes: Record<number, TypeResult>): ResponsesObject {
    const responses: ResponsesObject = {};

    for (const [key, typeResult] of Object.entries(returnTypes)) {
        responses[Number(key)] = {
            content: {
                "application/json": {
                    schema: toSchema(typeResult)
                }
            },
            description: "",
        }
    }
    return responses;
}

function toSchema(params?: TypeResult | null): SchemaObject | undefined {
    if (!params) {
        return;
    }
    const schema: SchemaObject = {
        type: params.type
    };

    if (params.type === "object") {
        const obj = (params as ObjectType);
        schema.title = obj.name;

        if (obj.name === "Date") {
            schema.type = "string";
            schema.format = "date-time";
            return schema;
        }
        const properties: Record<string, SchemaObject> = {};
        const requiredProperties = [];

        for (const [key, value] of Object.entries(obj.properties)) {
            const property_schema = toSchema(value);

            if (property_schema) {
                properties[key] = property_schema;
            }
            if (value && !value.optional) {
                requiredProperties.push(key);
            }
        }
        schema.properties = properties;

        if (requiredProperties.length) {
            schema.required = requiredProperties;
        }
    } else if (params.type === "Union") {
        const union = params as UnionType;
        const oneOf = union.unionTypes.map(toSchema).filter(v => v) as SchemaObject[];
        schema.oneOf = oneOf;
        schema.title = params.type + oneOf.map(v => v.title || v.type).map(v => v.slice(0, 1).toUpperCase() + v.slice(1)).join("")
    } else if (params.type === "Array") {
        const array = params as ArrayType;
        schema.items = toSchema(array.elementType);
    } else if (params.type === "Enum") {
        const enumParam = params as EnumType;
        schema.title = enumParam.name;

        const enumValues: any[] = [];
        // @ts-expect-error
        const memberNames: string[] = enumValues[enumNameSymbol] = [];

        Object.entries(enumParam.member).forEach(v => {
            enumValues.push(v[1].literalValue)
            memberNames.push(v[0]);
        });
        schema.enum = enumValues;
    } else if (params.type === "Record") {
        const record = params as RecordType;
        const valueSchema = toSchema(record.valueType);
        // @ts-expect-error
        valueSchema[keyTypeSymbol] = toSchema(record.keyType);
        schema.additionalProperties = valueSchema;
    }
    return schema;
}

function isEmpty(obj: any): boolean {
    return Object.keys(obj).length === 0;
}

function normalizePath(s: string): string {
    return s.replace(/\/+/g, "/");
}

function log(...any: any[]): void {
    console.log(...any);
}