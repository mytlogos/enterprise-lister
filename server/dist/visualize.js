"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const plato_1 = tslib_1.__importDefault(require("plato"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = tslib_1.__importDefault(require("path"));
const logger_1 = tslib_1.__importDefault(require("./logger"));
class Plato {
    static show() {
        const outputDir = "./output/dir";
        // null options for this example
        const options = {
            title: "Your title here",
            exclude: /babel/,
        };
        const callback = (report) => {
            logger_1.default.info("finished report");
            logger_1.default.info(report);
            // once done the analysis,
            // execute this
        };
        const files = Plato.files();
        plato_1.default.inspect(files, outputDir, options, callback);
        logger_1.default.info("finished execution");
    }
    static files() {
        const dirname = path_1.default.dirname(path_1.default.dirname(__dirname));
        const serverDir = path_1.default.join(dirname, "server", "dist");
        const workingDir = path_1.default.join(dirname, "dist");
        const files = loadFiles(serverDir, ["node_modules", "output", ".idea"], [".js"]);
        files.push(...loadFiles(workingDir, ["node_modules", "output", ".idea"], [".js"]));
        return files;
    }
}
function loadFiles(dir, excludeDir, includeFiles, files = []) {
    fs_1.default.readdirSync(dir, { withFileTypes: true })
        .forEach((value) => {
        if (value.isDirectory()) {
            if (excludeDir.includes(value.name)) {
                return;
            }
            loadFiles(path_1.default.join(dir, value.name), excludeDir, includeFiles, files);
        }
        else if (value.isFile()) {
            if (includeFiles.some((extension) => value.name.endsWith(extension))) {
                files.push(path_1.default.join(dir, value.name));
            }
        }
    });
    return files;
}
Plato.show();
//# sourceMappingURL=visualize.js.map