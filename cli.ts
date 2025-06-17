#!/usr/bin/env node

import { XMLSerializer } from '@xmldom/xmldom';
import { DocumentCollector } from './index';
import * as process from "process";
import * as config from "./config";

const collector = new DocumentCollector(config.pathToImport, config.LIMIT);

if (process.argv.length < 3 || process.argv[2][0] == "-") {
    console.error("Please provide a list of XML files to catenate as command-line arguments.");
    console.error(config.configMessage);
    process.exit(1);
}
collector.loadShellDocument(config.templatePath, config.pathToParent).then(async () => {
    await collector.ingestFiles(process.argv.slice(2));

    console.log(new XMLSerializer().serializeToString(collector.doc!))
}, err => console.error(err))

