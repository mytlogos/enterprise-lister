import * as ts from "typescript";
import {
    CallExpression,
    EnumMember,
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
import yaml from "js-yaml";
import * as fs from "fs";
import { Optional, Nullable } from "../types";

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
    type: "Array" | "boolean" | "number" | "string" | "object" | "null" | "Union";
    /**
     * for literal values
     */
    literalValue?: any;
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

interface ObjectProperties {
    [key: string]: TypeResult;
}

interface ObjectType extends TypeResult {
    type: "object";
    properties: ObjectProperties;
    literalValue?: Record<string, unknown>;
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

// this should hold the requirements on the request
// and the possible return types and error codes
interface MiddlewareResult {
    returnTypes: null | TypeResult;
    queryType?: { [key: string]: null };
    bodyType?: { [key: string]: null };
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
    queryParams: { [key: string]: any };
    bodyParams: any;
}

interface ResponseInfo {
    header: { [key: string]: any };
    body: Nullable<TypeResult>;
}

interface TotalResponseInfo {
    [code: number]: ResponseInfo;
}

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
function generateExpressApiObject(fileNames: string[], options: ts.CompilerOptions): ExportExpressResult {
    // Build a program using the set of root file names in fileNames
    const program = ts.createProgram(fileNames, options);

    // Get the checker, we will use it to find more about classes
    const checker = program.getTypeChecker();
    const baseFiles = fileNames.map((value) => path.basename(value));
    const sourceFiles = program.getSourceFiles().filter((value) => baseFiles.includes(path.basename(value.fileName)));
    const functionMap: Map<ts.Symbol, FunctionEntry> = new Map();
    const routerVariables: Set<ts.Symbol> = new Set();
    const routerMap: Map<ts.Symbol, RouterEntry> = new Map();
    const routeMap: Map<ts.Symbol, RouteEntry> = new Map();

    let currentlyConvertingRouter: Nullable<ts.Symbol> = null;

    // Visit every sourceFile in the program
    for (const sourceFile of sourceFiles) {
        if (!sourceFile.isDeclarationFile) {
            // Walk the tree to search for classes
            ts.forEachChild(sourceFile, visit);
        }
    }
    const result: ExportExpressResult = {};

    for (const [key, functionEntry] of functionMap.entries()) {
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
            functionEntry.returnRouter = getReturnRouter(key.valueDeclaration as ts.FunctionDeclaration, null);
        }

        const returnedRouter = functionEntry.returnRouter;

        if (!returnedRouter) {
            console.log("Exported Function does not return a router: " + name);
            continue;
        }
        const routerEntry = routerMap.get(returnedRouter);

        if (!routerEntry) {
            throw Error("No entry available for: " + returnedRouter);
        }
        currentlyConvertingRouter = returnedRouter;
        result[name] = routeEntryToResult(routerEntry);
    }
    console.log(JSON.stringify(result, null, 4));
    // print out the doc
    // fs.writeFileSync("classes.json", JSON.stringify(output, undefined, 4));
    return result;

    function routeEntryToResult(routerEntry: RouterEntry): RouterResult {
        const routerResult: RouterResult = {paths: [], routes: {}, middlewares: [], subRouter: {}};

        for (const [routerPath, functionCallEntry] of Object.entries(routerEntry.subRouter)) {
            const subRouterSymbol = functionCallEntry.returnRouter;

            if (!subRouterSymbol) {
                console.log("Middleware Function does not return router");
                continue;
            }
            if (subRouterSymbol === currentlyConvertingRouter) {
                throw Error("Currently converting Router is recursively a sub router of itself!: " + subRouterSymbol);
            }
            const subRouterEntry = routerMap.get(subRouterSymbol);

            if (!subRouterEntry) {
                throw Error("Sub router as no entry: " + subRouterSymbol);
            }
            routerResult.subRouter[routerPath] = routeEntryToResult(subRouterEntry);
        }
        for (const [routePath, route] of Object.entries(routerEntry.routes)) {
            const routeResult: RouteResult = routerResult.routes[routePath] = {};

            for (const [method, middleware] of Object.entries(route)) {
                routeResult[method] = middlewareToResult(middleware);
            }
        }
        for (const pathEntry of routerEntry.paths) {
            routerResult.paths.push({
                path: pathEntry.path,
                // @ts-expect-error
                method: pathEntry.method,
                middleware: middlewareToResult(pathEntry.middleware)
            });
        }
        routerResult.middlewares = routerEntry.middlewares.map(middlewareToResult);
        return routerResult;
    }

    function createStackElement(signature: SignatureDeclaration, symbolNode?: ts.Node): Nullable<StackElement> {
        if (!symbolNode) {
            return null;
        }
        const symbol = getSymbol(symbolNode);
        return !symbol ? null : {
            signature,
            symbol,
            arguments: [],
            isGlobal: hasOuterFunction(signature)
        };
    }

    function middlewareToResult(middleware: Middleware): MiddlewareResult {
        const middlewareSymbol = checker.getSymbolAtLocation(middleware);

        const middlewareResult: MiddlewareResult = {returnTypes: null};
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
                stackElement = createStackElement(initializer, valueDeclaration.name);
            } else {
                // TODO: 10.08.2020 middleware aliases like putProgress
                return middlewareResult;
            }
        } else if (ts.isFunctionDeclaration(valueDeclaration)) {
            stackElement = createStackElement(valueDeclaration, valueDeclaration.name);
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
            requestInfo: {bodyParams: {}, queryParams: {}},
            responseInfo: {},
            currentStackElement: stackElement
        };

        searchMiddlewareStack(container);
        middlewareResult.queryType = container.requestInfo.queryParams;
        middlewareResult.bodyType = container.requestInfo.bodyParams;
        middlewareResult.returnTypes = container.responseInfo[200] ? container.responseInfo[200].body : null;
        return middlewareResult;
    }

    function searchMiddlewareStack(container: SearchContainer): void {
        const middlewareSignature = container.currentStackElement.signature;
        const currentFunctionSymbol = container.currentStackElement.symbol;
        // prevent infinite recursion
        if (container.callStack.find((value) => value.symbol === currentFunctionSymbol)) {
            console.log("Recursive call of: " + middlewareSignature.getText());
            return;
        }
        container.callStack.push(container.currentStackElement);
        const parameterSymbols = middlewareSignature.parameters
            .map((value) => getSymbol(value.name))
            .filter((value) => value) as ts.Symbol[];

        const requestParamSymbol = parameterSymbols.find((value) => {
            const typeSymbol = checker.getTypeOfSymbolAtLocation(value, value.valueDeclaration).getSymbol();
            return typeSymbol && typeSymbol.name === "Request";
        });
        const responseParamSymbol = parameterSymbols.find((value) => {
            const typeSymbol = checker.getTypeOfSymbolAtLocation(value, value.valueDeclaration).getSymbol();
            return typeSymbol && typeSymbol.name === "Response";
        });

        if (!requestParamSymbol && !responseParamSymbol) {
            console.log(
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
                searchMiddlewareStatement(body, container);
            }
        } else if ((ts.isFunctionDeclaration(middlewareSignature)
            || ts.isFunctionExpression(middlewareSignature)) && middlewareSignature.body) {
            functionStatements = middlewareSignature.body.statements;
        }
        if (functionStatements) {
            for (const statement of functionStatements) {
                searchMiddlewareStatement(statement, container);
            }
        }
    }

    function searchMiddlewareStatement(body: ts.Node, container: SearchContainer) {
        const requestAccesses = getChildrenThat(body, (t) => {
            if (ts.isPropertyAccessExpression(t)) {
                if (t.expression.kind !== SyntaxKind.Identifier) {
                    return false;
                }
                // the value which property will be accessed
                const valueSymbol = checker.getSymbolAtLocation(t.expression);
                return valueSymbol === container.currentStackElement.requestSymbol;
            } else {
                return false;
            }
        }) as PropertyAccessExpression[];
        for (const requestAccess of requestAccesses) {
            const propertyIdentifier = requestAccess.name;

            if (propertyIdentifier.text === "query") {
                const queryProperties = getPropertyAccess(requestAccess, container);

                if (queryProperties.length) {
                    for (const queryProperty of queryProperties) {
                        // TODO: 10.08.2020 infer type for query
                        container.requestInfo.queryParams[queryProperty] = {};
                    }
                } else {
                    console.log("unknown request.query property: " + requestAccess.getText());
                }
            } else if (propertyIdentifier.text === "body") {
                const queryProperties = getPropertyAccess(requestAccess, container);

                if (queryProperties.length) {
                    for (const queryProperty of queryProperties) {
                        // TODO: 10.08.2020 infer type for query
                        container.requestInfo.queryParams[queryProperty] = {};
                    }
                } else {
                    console.log("unknown request.body property: " + requestAccess.getText());
                }
            }
        }
        nodeToString(body);

        const callsOnResponse = getChildrenThat(body, (t) => {
            if (ts.isCallExpression(t)) {
                return ts.isPropertyAccessExpression(t.expression)
                    && isSymbol(t.expression.expression, container.currentStackElement.responseSymbol);
            } else {
                return false;
            }
        }) as CallExpression[];

        for (const callExpression of callsOnResponse) {
            const identifier = getFirstCallIdentifier(callExpression);

            if (!identifier) {
                console.log("No Identifier for Response.method: " + callExpression.getText());
                continue;
            }
            processResponseCall(callExpression, identifier.text, container);
        }

        const callsWithEitherReqOrRes = getChildrenThat(body, (t) => {
            if (ts.isCallExpression(t)) {
                for (const argument of t.arguments) {
                    if (ts.isIdentifierOrPrivateIdentifier(argument)) {
                        return isSymbol(argument, container.currentStackElement.requestSymbol)
                            || isSymbol(argument, container.currentStackElement.responseSymbol);
                    }
                }
            }
            return false;
        }) as CallExpression[];

        for (const callExpression of callsWithEitherReqOrRes) {
            if (ts.isIdentifierOrPrivateIdentifier(callExpression.expression)) {
                const callSymbol = checker.getSymbolAtLocation(callExpression.expression);
                if (!callSymbol) {
                    console.log("No Symbol for Call: " + callExpression.expression.getText());
                    continue;
                }
                const declaration = callSymbol.valueDeclaration;
                if (!ts.isFunctionLike(declaration)) {
                    console.log(
                        "Value Declaration of Call Symbol is no SignatureDeclaration: "
                        + callExpression.expression.getText()
                    );
                    continue;
                }
                const currentStackElement = createStackElement(declaration, declaration.name);

                if (!currentStackElement) {
                    continue;
                }

                currentStackElement.arguments.push(...callExpression.arguments);
                container.currentStackElement = currentStackElement;
                searchMiddlewareStack(container);
                container.callStack.pop();
            }
        }
    }

    function hasOuterFunction(func: ts.Node): boolean {
        return !hasParentThat(func, (node) => ts.isFunctionLike(node));
    }

    function isSymbol(node: ts.Node, symbol?: ts.Symbol): boolean {
        return !!symbol && getSymbol(node) === symbol;
    }

    function processResponseCall(callExpression: CallExpression, methodName: string, container: SearchContainer) {
        const responseInfo: ResponseInfo = {header: {}, body: null};
        if (methodName === "append") {
            // by Express v4.11.0+
            const headerKey = callExpression.arguments[0];
            const headerValue = callExpression.arguments[1];

            if (!headerKey || !ts.isStringLiteralLike(headerKey)) {
                console.log("expected string literal as header key: " + callExpression.getText());
                return;
            }
            let value = null;

            // TODO: 10.08.2020 accept string array also
            if (headerValue) {
                if (!ts.isStringLiteralLike(headerValue)) {
                    console.log("expected string literal as header key: " + callExpression.getText());
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
            if (ts.isIdentifier(body)) {
                const symbol = getSymbol(body);

                if (!symbol) {
                    console.log("No Symbol for Identifier: " + body);
                } else {
                    const type = checker.getTypeOfSymbolAtLocation(symbol, body);

                    if (checker.typeToString(type) === "any") {
                        if (isParameter(symbol.valueDeclaration)) {
                            const parentOfFunction = symbol.valueDeclaration.parent.parent;

                            if (ts.isCallExpression(parentOfFunction) && ts.isPropertyAccessExpression(parentOfFunction.expression)) {
                                const property = parentOfFunction.expression.name.text;

                                if (property === "then") {
                                    const leftHandSideExpression = parentOfFunction.expression.expression;

                                    if (ts.isIdentifier(leftHandSideExpression)) {
                                        const leftSideSymbol = getSymbol(leftHandSideExpression);

                                        if (leftSideSymbol && ts.isParameter(leftSideSymbol.valueDeclaration) && leftSideSymbol.valueDeclaration.parent === container.currentStackElement.signature) {
                                            const index = container.currentStackElement.signature.parameters.indexOf(leftSideSymbol.valueDeclaration);
                                            const argument = container.currentStackElement.arguments[index];

                                            if (ts.isCallExpression(argument)) {
                                                if (ts.isPropertyAccessExpression(argument.expression)) {
                                                    const targetValue = argument.expression.expression;
                                                    if (ts.isIdentifier(targetValue)) {
                                                        const method = argument.expression.name;
                                                        if (targetValue.text === "Promise") {

                                                            if (method.text === "resolve" && argument.arguments.length === 1) {
                                                                const resolveValue = argument.arguments[0];

                                                                if (ts.isLiteralExpression(resolveValue)) {
                                                                    const promiseType = checker.getContextualType(resolveValue);
                                                                } else if (ts.isPropertyAccessExpression(resolveValue)) {
                                                                    resolveValue.name;
                                                                }
                                                            }
                                                        } else {
                                                            const methodSymbol = getSymbol(method);
                                                            if (methodSymbol && ts.isFunctionLike(methodSymbol.valueDeclaration)) {
                                                                const signature = checker.getSignatureFromDeclaration(methodSymbol.valueDeclaration);

                                                                if (signature) {
                                                                    const returnType = checker.getReturnTypeOfSignature(signature);
                                                                    const typeSymbol = returnType.getSymbol();

                                                                    if (typeSymbol && typeSymbol.getName() === "Promise") {
                                                                        // @ts-expect-error
                                                                        const promiseTypes = checker.getTypeArguments(returnType);

                                                                        if (promiseTypes.length === 1) {
                                                                            const promiseType = promiseTypes[0];
                                                                            responseInfo.body = typeToResult(promiseType);
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            } else if (ts.isIdentifier(argument)) {
                                                // TODO: do sth here
                                            }
                                        }
                                    }
                                }
                            }
                        } else if (isVariableDeclaration(symbol.valueDeclaration)) {
                            // TODO: 11.08.2020 infer from variable declaration
                        }
                    } else {
                        // TODO: 11.08.2020 do cool stuff with type
                    }
                }
            } else if (ts.isLiteralExpression(body)) {
                const contextualType = checker.getContextualType(body);
            } else if (ts.isCallExpression(body)) {
                const identifier = getFirstCallIdentifier(body);

                if (!identifier) {
                    console.log("No Identifier for CallExpression: " + body.getText());
                } else {
                    const callSymbol = getSymbol(identifier);
                    if (!callSymbol) {
                        console.log("No Symbol for Identifier of CallExpression: " + body.getText());
                    } else {
                        const signature = checker.getSignatureFromDeclaration(callSymbol.valueDeclaration as FunctionDeclaration);
                        if (!signature) {
                            console.log("No Signature for CallExpression: " + body.getText());
                        } else {
                            const type = checker.getReturnTypeOfSignature(signature);
                        }
                    }
                }
            }
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
            console.log("Unknown call on response: " + callExpression.getText());
        }
    }

    function typeToResult(type: ts.Type): Nullable<TypeResult> {
        const typeString = checker.typeToString(type);
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
        }
        // TODO: 12.08.2020 literalValue
        const symbol = type.getSymbol();

        if (!symbol) {
            console.log("No Symbol for Type: " + type);
            return null;
        }
        if (ts.isFunctionLike(symbol.valueDeclaration)) {
            return null;
        }
        if (symbol.name === "Array") {
            // @ts-expect-error
            const arrayTypes = checker.getTypeArguments(type);

            if (arrayTypes.length === 1) {
                const arrayType: ts.Type = arrayTypes[0];
                const elementType = typeToResult(arrayType);
                // const elementProperties = checker.getPropertiesOfType(arrayType);
                return {
                    type: "Array",
                    elementType,
                } as ArrayType;
            } else {
                console.log("Array type does not have exactly one TypeParameter: " + arrayTypes);
                return null;
            }
        }
        if (symbol.valueDeclaration && ts.isEnumDeclaration(symbol.valueDeclaration)) {
            const enumMember = getChildrenThat(
                symbol.valueDeclaration,
                (t) => t.kind === ts.SyntaxKind.EnumMember
            ) as EnumMember[];
            const unions: TypeResult[] = [];
            for (const member of enumMember) {
                const first = getFirst(member, ts.SyntaxKind.FirstLiteralToken);
                if (first) {
                    const firstType = checker.getTypeAtLocation(first);
                    if (firstType.isNumberLiteral()) {
                        unions.push({
                            type: "number"
                        } as NumberType);
                    } else if (firstType.isStringLiteral()) {
                        unions.push({
                            type: "string"
                        } as StringType);
                    }
                } else {
                    unions.push({
                        type: "string"
                    } as StringType);
                }
            }
            return {
                type: "Union",
                unionTypes: unions
            } as UnionType;
        }
        // assume a object type
        const properties: ObjectProperties = {};
        for (const value of checker.getPropertiesOfType(type)) {
            const symbolType = checker.getTypeOfSymbolAtLocation(value, value.valueDeclaration);
            const typeResult = typeToResult(symbolType);

            if (typeResult) {
                properties[value.getName()] = typeResult;
            }
        }
        return {
            type: "object",
            properties
        } as ObjectType;

    }

    function getPropertyAccess(node: ts.Node, container: SearchContainer): string[] {
        const parent = node.parent;

        if (ts.isElementAccessExpression(parent)) {
            const keyNode = parent.argumentExpression;
            const value = getStringLiteralValue(keyNode, container);
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

    function getStringLiteralValue(node: ts.Node, container: SearchContainer, stackLevel?: number): Nullable<string> {
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
            const keySymbol = getSymbol(node);

            if (!keySymbol) {
                console.log("cannot find symbol for ElementAccess of: " + node.parent.getText());
                return null;
            }
            if (ts.isParameter(keySymbol.valueDeclaration)) {
                const parameterIndex = stackElement.signature.parameters.indexOf(keySymbol.valueDeclaration);
                const argument = stackElement.arguments[parameterIndex];

                if (!argument) {
                    return null;
                }
                return getStringLiteralValue(argument, container, stackLevel - 1);
            } else {
                console.log("Unknown node type, not a parameter: " + keySymbol.valueDeclaration.getText());
            }
            // TODO: 10.08.2020 try to infer from variableDeclaration
        } else {
            console.log("unknown node: neither StringLiteral or Identifier: " + node.getText());
        }
        return null;
    }

    function getReturnRouter(outerFunction: ts.FunctionDeclaration,
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
                const identifierSymbol = checker.getSymbolAtLocation(identifier);
                return identifierSymbol
                    && (routerVariables.has(identifierSymbol)
                        || identifierSymbol === variableSymbol);
            });
        if (returnNodes.length > 1) {
            console.log("more than one return router statement");
        } else if (returnNodes.length === 1) {
            const lastReturn = returnNodes.pop() as ts.Node;
            const routerIdentifier = getFirst(lastReturn, SyntaxKind.Identifier) as ts.Node;
            return checker.getSymbolAtLocation(routerIdentifier) as ts.Symbol;
        } else {
            console.log("No Router returned for function: " + outerFunction.getText());
        }
    }

    function inspectVariableDeclaration(node: ts.VariableDeclaration) {
        const initializer = node.initializer;
        if (!initializer) {
            return;
        }
        const firstCallIdentifier = getFirstCallIdentifier(initializer);
        // check if the right side of the declaration is a router creation call
        if (firstCallIdentifier) {
            const symbol = checker.getSymbolAtLocation(firstCallIdentifier);
            if (symbol) {
                if (symbol.getName() === "Router") {
                    const outerFunction = getFirstParent(
                        node,
                        ts.SyntaxKind.FunctionDeclaration
                    ) as ts.FunctionDeclaration;
                    const variableSymbol = checker.getSymbolAtLocation(node.name) as ts.Symbol;
                    const outerFunctionSymbol = checker.getSymbolAtLocation(outerFunction.name as Identifier);

                    if (!outerFunctionSymbol) {
                        console.log("Missing Symbol for outer Function: " + outerFunction.getText());
                        return;
                    }
                    const functionEntry = getFunctionEntry(outerFunctionSymbol);
                    functionEntry.router.push(variableSymbol);
                    functionEntry.exported = isNodeExported(outerFunction);
                    functionEntry.returnRouter = getReturnRouter(outerFunction, variableSymbol);

                    routerVariables.add(variableSymbol);
                } else if (symbol.getName() === "route") {
                    const routerIdentifier = getFirst(initializer, ts.SyntaxKind.Identifier) as Identifier;
                    const routerSymbol = checker.getSymbolAtLocation(routerIdentifier);

                    if (!routerSymbol) {
                        console.log("No Symbol for Router Variable at position: " + routerIdentifier.pos);
                        return;
                    }
                    const call = getFirst(initializer, SyntaxKind.CallExpression) as CallExpression;
                    if (call.arguments.length !== 1) {
                        console.log("Require exactly on argument for method 'route' on position: " + call.pos);
                        return;
                    } else {
                        const expression = call.arguments[0];
                        const routerEntry = getRouterEntry(routerSymbol);
                        const variableSymbol = checker.getSymbolAtLocation(node.name) as ts.Symbol;

                        if (ts.isStringLiteral(expression)) {
                            const routePath = expression.text;
                            routerEntry.routes[routePath] = getRouteEntry(variableSymbol);
                        } else {
                            console.log("Require string literal as path for method 'route' on position: " + call.pos);
                        }
                    }
                } else {
                    console.log(`Unknown Call Symbol for ${symbol.getName()}`);
                }
            } else {
                console.log(`No Symbol for ${node.getText()}`);
            }
        }
    }

    function processRouter(propertyName: ts.Identifier | ts.PrivateIdentifier, node: ts.Node,
        variableSymbol: ts.Symbol, variableIdentifier: ts.LeftHandSideExpression) {
        const name = propertyName.text;
        const parameterList = getFirst(node, ts.SyntaxKind.SyntaxList) as SyntaxList;
        if (isHttpMethod(name)) {
            if (!parameterList) {
                console.log("No Parameter for Http method call!");
                return;
            }
            const pathLiteral = parameterList.getChildAt(0) as StringLiteral;
            const middleWareNode = parameterList.getChildAt(2);

            const routerEntry = getRouterEntry(variableSymbol);
            routerEntry.paths.push({
                path: pathLiteral.text,
                middleware: middleWareNode,
                method: name
            });
        } else if (name.toLowerCase() === "use") {
            if (!parameterList) {
                console.log(`No Middleware supplied to ${variableIdentifier.getText()}.use!`);
                return;
            }
            if (parameterList.getChildCount() === 1) {
                const middleWareNode = parameterList.getChildAt(0);
                const routerEntry = getRouterEntry(variableSymbol);
                routerEntry.middlewares.push(middleWareNode);
            } else if (parameterList.getChildCount() === 3) {
                const pathLiteral = parameterList.getChildAt(0);

                if (ts.isStringLiteral(pathLiteral)) {
                    const middleWareNode = parameterList.getChildAt(2);
                    const nextCall = getFirst(middleWareNode, ts.SyntaxKind.CallExpression);

                    const routerEntry: RouterEntry = getRouterEntry(variableSymbol);
                    if (nextCall && ts.isCallExpression(nextCall)) {
                        const callIdentifier = getFirstCallIdentifier(nextCall);

                        if (callIdentifier) {
                            const functionSymbol = checker.getSymbolAtLocation(callIdentifier);
                            if (functionSymbol) {
                                const functionEntry = getFunctionEntry(functionSymbol);
                                const text = pathLiteral.text;
                                const subRouter = routerEntry.subRouter;
                                subRouter[text] = functionEntry;
                            } else {
                                console.log("No Function symbol for: " + callIdentifier.getText());
                            }
                        } else {
                            console.log("No Call Identifier for Call Expression: " + nextCall.getText());
                        }
                    } else {
                        console.log("Router.use where second argument is not a router:" + node.getText());
                    }
                } else {
                    console.log("Expected a string literal as path: " + node.getText());
                }
            } else {
                console.log(`Not exactly one or two Arguments supplied to *.use!: ${propertyName.parent.getText()}`);
            }
        } else {
            console.log(`Non http Method call: ${name}() on ${variableIdentifier.getText()}`);
        }
    }

    function processRoute(propertyName: ts.Identifier | ts.PrivateIdentifier, node: ts.Node,
        variableSymbol: ts.Symbol, variableIdentifier: ts.LeftHandSideExpression) {
        const name = propertyName.text;
        const parameterList = getFirst(node, ts.SyntaxKind.SyntaxList) as SyntaxList;
        if (isHttpMethod(name)) {
            if (!parameterList) {
                console.log("No Parameter for Http method call!");
                return;
            }
            const middleWareNode = parameterList.getChildAt(0);

            const routeEntry = getRouteEntry(variableSymbol);
            routeEntry[name] = middleWareNode;
        } else {
            console.log(`Non http Method call: ${name}() on ${variableIdentifier.getText()}`);
        }
    }

    function inspectCall(node: ts.Node) {
        const propertyAccess = getFirst(
            node,
            ts.SyntaxKind.PropertyAccessExpression
        ) as PropertyAccessExpression;

        // if there is a property access, assume a method is called with 'identifier.method()'
        if (propertyAccess) {
            const variableIdentifier = propertyAccess.expression;
            const propertyName = propertyAccess.name;
            const variableSymbol = checker.getSymbolAtLocation(variableIdentifier);

            if (!variableSymbol) {
                console.log("Variable Property Access has no Symbol: " + node.getText());
                return;
            }
            if (routerVariables.has(variableSymbol)) {
                processRouter(propertyName, node, variableSymbol, variableIdentifier);
            } else if (routeMap.has(variableSymbol)) {
                processRoute(propertyName, node, variableSymbol, variableIdentifier);
            } else {
                console.log("Unknown Method Call: " + node.getText());
            }
        } else {
            const firstIdentifier = getFirst(node, ts.SyntaxKind.Identifier);
            if (firstIdentifier) {
                const symbol = checker.getSymbolAtLocation(firstIdentifier);

                if (symbol) {
                    console.log(`${ts.SyntaxKind[node.kind]}: Call ${node.getFullText()}`);
                } else {
                    console.log(`No Symbol for ${firstIdentifier.getText()}`);
                }
            }
        }
    }

    function getSymbol(value: ts.Node) {
        return checker.getSymbolAtLocation(value);
    }

    function getFunctionEntry(symbol: ts.Symbol): FunctionEntry {
        return getOrInit(functionMap, symbol, () => {
            return {
                exported: false,
                router: []
            } as FunctionEntry;
        });
    }

    function getRouterEntry(symbol: ts.Symbol): RouterEntry {
        return getOrInit(routerMap, symbol, () => {
            return {routes: {}, middlewares: [], paths: [], subRouter: {}} as RouterEntry;
        });
    }

    function getRouteEntry(symbol: ts.Symbol): RouteEntry {
        return getOrInit(routeMap, symbol, () => {
            return {} as RouteEntry;
        });
    }

    /** visit nodes finding exported classes */
    function visit(node: ts.Node) {
        if (ts.isVariableDeclaration(node) && ts.SyntaxKind.Identifier === node.name.kind) {
            inspectVariableDeclaration(node);
        } else if (ts.isCallExpression(node)) {
            inspectCall(node);
        } else {
            ts.forEachChild(node, visit);
        }
    }

    /** Serialize a symbol into a json object */
    function serializeSymbol(symbol: ts.Symbol): DocEntry {
        return {
            name: symbol.getName(),
            documentation: ts.displayPartsToString(symbol.getDocumentationComment(checker)),
            type: checker.typeToString(
                checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!)
            )
        };
    }

    /** Serialize a class symbol information */
    function serializeClass(symbol: ts.Symbol) {
        const details = serializeSymbol(symbol);

        // Get the construct signatures
        const constructorType = checker.getTypeOfSymbolAtLocation(
            symbol,
            symbol.valueDeclaration!
        );
        details.constructors = constructorType
            .getConstructSignatures()
            .map(serializeSignature);
        return details;
    }

    /** Serialize a signature (call or construct) */
    function serializeSignature(signature: ts.Signature) {
        return {
            parameters: signature.parameters.map(serializeSymbol),
            returnType: checker.typeToString(signature.getReturnType()),
            documentation: ts.displayPartsToString(signature.getDocumentationComment(checker))
        };
    }

    /** True if this is visible outside this file, false otherwise */
    function isNodeExported(node: ts.Node): boolean {
        return (
            (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0
            // || (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile)
        );
    }
}

const httpMethods = ["post", "get", "put", "delete"];

function isHttpMethod(name: string): boolean {
    return httpMethods.includes(name.toLowerCase());
}

function nodeToString(node: ts.Node): string {
    let s = "";
    visitor(node, (node1, level) => {
        const nodeText = node1.getText().replace(/\n/, "");
        const nodeKind = ts.SyntaxKind[node1.kind];
        const indent = "-".repeat(level);
        s += `${indent}${nodeKind}: ${nodeText}\n`;
        return false;
    });
    return s;
}

function visitor(node: ts.Node, callback: (node: ts.Node, level: number) => boolean, level = 0) {
    // do not visit children if true is returned
    if (!callback(node, level)) {
        ts.forEachChild(node, (child) => visitor(child, callback, level + 1));
    }
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

function previousNode(node: ts.Node): Nullable<ts.Node> {
    if (!node.parent) {
        return null;
    }
    const children = node.parent.getChildren();
    const index = children.indexOf(node);

    // if index is smaller than 1, it is either at index 0 or not in parent children list (ignore that)
    if (index < 1) {
        return null;
    }
    return node.parent.getChildAt(index - 1);
}

function isIdentifier(value: ts.Node): value is ts.Identifier {
    return value.kind === ts.SyntaxKind.Identifier;
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

    const paths = {};

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

function routerResultToOpenApi(router: RouterResult, paths: PathsObject, absolutePath = "/") {
    const parameterObjects: ParameterObject[] = [];
    const requestObject: RequestBodyObject = {
        content: {}
    };
    const currentReturnTypes: TypeResult[] = [];

    for (const middleware of router.middlewares) {
        if (middleware.bodyType) {
            const bodyKeys = Object.keys(middleware.bodyType);

            if (bodyKeys.length) {
                // @ts-expect-error
                requestObject.content["application/json"] = {
                    schema: {
                        type: "object",
                        properties: {...middleware.bodyType}
                    }
                } as MediaTypeObject;
            }
        }
        if (middleware.queryType) {
            for (const queryTypeKey of Object.keys(middleware.queryType)) {
                parameterObjects.push({
                    in: "query",
                    name: queryTypeKey,
                });
            }
        }
        if (middleware.returnTypes) {
            currentReturnTypes.push(middleware.returnTypes);
        }
    }
    const contentCopyString = JSON.stringify(requestObject.content);

    for (const routerPath of router.paths) {
        const pathObject: PathItemObject = {};
        const pathParameters: ParameterObject[] = [];
        const pathRequestObject: RequestBodyObject = {
            content: JSON.parse(contentCopyString)
        };
        const middleware = routerPath.middleware;

        if (middleware.bodyType) {
            const bodyKeys = Object.keys(middleware.bodyType);

            if (bodyKeys.length) {
                // @ts-expect-error
                pathRequestObject.content["application/json"] = {
                    schema: {
                        type: "object",
                        properties: {...middleware.bodyType}
                    }
                } as MediaTypeObject;
            }
        }
        if (middleware.queryType) {
            for (const queryTypeKey of Object.keys(middleware.queryType)) {
                pathParameters.push({
                    in: "query",
                    name: queryTypeKey,
                });
            }
        }
        if (middleware.returnTypes) {
            currentReturnTypes.push(middleware.returnTypes);
        }

        pathObject[routerPath.method] = {
            parameters: pathParameters,
            requestBody: pathRequestObject,
            responses: {
                200: {
                    content: {
                        "application/json": {
                            schema: {
                                type: routerPath.middleware.returnTypes && routerPath.middleware.returnTypes.type
                            }
                        }
                    },
                    description: "",
                }
            }
        } as OperationObject;
        paths[absolutePath + routerPath.path] = pathObject;
    }

    for (const [pathKey, routeValue] of Object.entries(router.routes)) {
        const pathObject: PathItemObject = paths[absolutePath + pathKey] =  {};

        for (const [method, middleware] of Object.entries(routeValue)) {
            const routeRequestObject: RequestBodyObject = {
                content: JSON.parse(contentCopyString)
            };
            const routeParameterObjects: ParameterObject[] = [...parameterObjects];

            if (middleware.bodyType) {
                const bodyKeys = Object.keys(middleware.bodyType);

                if (bodyKeys.length) {
                    // @ts-expect-error
                    routeRequestObject.content["application/json"] = {
                        schema: {
                            type: "object",
                            properties: {...middleware.bodyType}
                        }
                    } as MediaTypeObject;
                }
            }
            if (middleware.queryType) {
                for (const queryTypeKey of Object.keys(middleware.queryType)) {
                    routeParameterObjects.push({
                        in: "query",
                        name: queryTypeKey,
                    });
                }
            }
            if (middleware.returnTypes) {
                currentReturnTypes.push(middleware.returnTypes);
            }

            // @ts-expect-error
            pathObject[method] = {
                parameters: routeParameterObjects,
                requestBody: routeRequestObject,
                responses: {
                    200: {
                        content: {
                            "application/json": {
                                schema: {
                                    type: middleware.returnTypes && middleware.returnTypes.type
                                }
                            }
                        },
                        description: "",
                    }
                }
            } as OperationObject;
        }
    }
    const parentRouter = router as ParentRouterResult;
    parentRouter.path = absolutePath;

    for (const [pathKey, subRouter] of Object.entries(router.subRouter)) {
        const subPath = (absolutePath + pathKey).replace("//", "/");
        routerResultToOpenApi(subRouter, paths, subPath);
    }
}

/**
 * OpenApi v3 Specification.
 */
interface OpenApiObject {
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

interface ExternalDocumentationObject {
    description?: string;
    url: string;
}

interface TagObject {
    name: string;
    description?: string;
    externalDocs?: ExternalDocumentationObject;
}

interface SecurityRequirementObject {
    [securitySchemeName: string]: string[];
}

/**
 * Requirement on string keys: '^[a-zA-Z0-9\.\-_]+$'.
 */
interface ComponentsObject {
    schemas?: ApiMap<SchemaObject | ReferenceObject>;
    responses?: ApiMap<ResponseObject | ReferenceObject>;
    parameters?: ApiMap<ExampleObject | ReferenceObject>;
    requestBodies?: ApiMap<RequestBodyObject | ReferenceObject>;
    headers?: ApiMap<HeaderObject | ReferenceObject>;
    securitySchemes?: ApiMap<SecuritySchemeObject | ReferenceObject>;
    links?: ApiMap<LinkObject | ReferenceObject>;
    callbacks?: ApiMap<CallbackObject | ReferenceObject>;
}

interface CallbackObject {
    [expression: string]: PathItemObject;
}

interface LinkObject {
    operationRef?: string;
    operationId?: string;
    parameters?: ApiMap<any | string>;
    requestBody?: any | string;
    description?: string;
    server?: ServerObject;
}

interface SecuritySchemeObject {
    type: "apiKey" | "http" | "oauth2" | "openIdConnect";
    description?: string;
}

interface ApikeySecuritySchemeObject extends SecuritySchemeObject {
    type: "apiKey";
    name: string;
    in: "query" | "header" | "cookie";
}

interface HttpSecuritySchemeObject extends SecuritySchemeObject {
    type: "http";
    scheme: string;
    bearerFormat?: string;
}

interface OAuth2SecuritySchemeObject extends SecuritySchemeObject {
    type: "oauth2";
    flows: OAuthFlowsObject;
}

interface OAuthFlowsObject {
    implicit?: OAuthFlowObject;
    password?: OAuthFlowObject;
    clientCredentials?: OAuthFlowObject;
    authorizationCode?: OAuthFlowObject;
}

interface OAuthFlowObject {
    authorizationUrl: string;
    tokenUrl: string;
    refreshUrl?: string;
    scopes: ApiMap<string>;
}

interface OpenIdConnectSecuritySchemeObject extends SecuritySchemeObject {
    type: "openIdConnect";
    openIdConnectUrl: string;
}

interface HeaderObject {
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

interface RequestBodyObject {
    description?: string;
    content: ApiMap<MediaTypeObject>;
    required?: boolean;
}

interface ExampleObject {
    summary?: string;
    description?: string;
    value?: any;
    externalValue?: string;
}

interface ResponseObject {
    description: string;
    headers?: ApiMap<HeaderObject | ReferenceObject>;
    content?: ApiMap<MediaTypeObject>;
    links?: ApiMap<LinkObject | ReferenceObject>;
}

interface ReferenceObject {
    $ref: string;
}

interface SchemaObject {
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
    items?: Array<SchemaObject | ReferenceObject>;
    properties?: { [property: string]: SchemaObject | ReferenceObject };
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
    nullable?: string;
    discriminator?: DiscriminatorObject;
    readOnly?: boolean;
    writeOnly?: boolean;
    xml?: XMLObject;
    externalDocs?: ExternalDocumentationObject;
    example?: any;
    deprecated?: boolean;
}

interface XMLObject {
    name?: string;
    namespace?: string;
    prefix?: string;
    attribute?: boolean;
    wrapped?: boolean;
}

interface DiscriminatorObject {
    propertyName: string;
    mapping?: ApiMap<string>;
}

/**
 * Path must begin with '/'.
 */
interface PathsObject {
    [path: string]: PathItemObject;
}

interface PathItemObject {
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

interface ParameterObject {
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

interface MediaTypeObject {
    schema?: SchemaObject | ReferenceObject;
    example?: any;
    examples?: ApiMap<ExampleObject | ReferenceObject>;
    encoding?: ApiMap<EncodingObject>;
}

interface EncodingObject {
    contentType?: string;
    headers?: ApiMap<HeaderObject | ReferenceObject>;
    style?: string;
    explode?: string;
    allowReserved?: string;
}

interface OperationObject {
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

interface ResponsesObject {
    default?: ResponseObject | ReferenceObject;

    [code: number]: ResponseObject | ReferenceObject;
}

interface ServerObject {
    url: string;
    description?: string;
    variables?: ApiMap<ServerVariableObject>;
}

interface ServerVariableObject {
    enum?: string[];
    default: string;
    description?: string;
}

interface InfoObject {
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

type ApiMap<T> = { [key: string]: T } | Map<string, T>;

interface LicenseObject {
    name: string;
    url?: string;
}

interface ContactObject {
    name?: string;
    url?: string;
    email?: string;
}

function templateOpenApi(openApi: OpenApiObject): string {
    return yaml.dump(openApi);
}

function GenerateOpenApi(file: string) {
    const expressResult = generateExpressApiObject([file], {
        target: ts.ScriptTarget.ES5,
        module: ts.ModuleKind.CommonJS
    });

    const openApiObject = transformToOpenApi(expressResult);
    const templateResult = templateOpenApi(openApiObject);
    fs.writeFileSync("../../../result.yaml", templateResult, {encoding: "utf8"});
    console.log(templateResult);
}

GenerateOpenApi("../../bin/api.ts");
