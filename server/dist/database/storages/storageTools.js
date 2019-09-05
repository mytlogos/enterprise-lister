"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const queryContext_1 = require("../contexts/queryContext");
exports.queryContextProvider = (con) => new queryContext_1.QueryContext(con);
/**
 * Escapes the Characters for an Like with the '|' char.
 */
function escapeLike(s, { singleQuotes = false, noBoundaries = false, noRightBoundary = false, noLeftBoundary = false } = {}) {
    if (!s) {
        return "";
    }
    s = s.replace(/([%_])/g, "|$1");
    if (singleQuotes) {
        s = s.replace(/[`´'‘]/g, "_");
    }
    if (noBoundaries) {
        s = "%" + s + "%";
    }
    else if (noLeftBoundary) {
        s = "%" + s;
    }
    else if (noRightBoundary) {
        s = s + "%";
    }
    return s;
}
exports.escapeLike = escapeLike;
//# sourceMappingURL=storageTools.js.map