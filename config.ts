import { env, argv } from "process";
import { realpathSync } from "fs";
import * as path from "path";

let installPath = path.dirname(realpathSync(argv[1]));
if (path.basename(installPath) == "dist") {
    installPath = path.dirname(installPath);
}
export const defaultNamespace = env["CATENATE_DEFAULT_NAMESPACE"] ?? "http://www.opengis.net/kml/2.2";
export const LIMIT = parseInt(env["CATENATE_OPEN_LIMIT"] || "5");
export const pathToParent = env["CATENATE_TARGET_PARENT"] || "//kml:Document";
export const pathToImport = env["CATENATE_IMPORT_SOURCE"] || "//kml:Placemark";
export const templatePath = env["CATENATE_TEMPLATE_PATH"] || path.join(installPath, "resources", "shell.kml")

export const configMessage = `
Options are specified as environment settings:
CATENATE_DEFAULT_NAMESPACE (set to <${defaultNamespace}>): XML default namespace URI, if specified in source documents (all documents must agree on namespace)
CATENATE_OPEN_LIMIT (set to <${LIMIT}>): Number of concurrent open files
CATENATE_TARGET_PARENT (set to <${pathToParent}>): XPath expression for element to appent to in template document
CATENATE_IMPORT_SOURCE (set to <${pathToImport}>): XPath expression to find elements in source documents that should be included in result
CATENATE_TEMPLATE_PATH (set to <${templatePath}>): Filesystem path for template document
`