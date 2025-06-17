import { DOMParser, Document, Node as domNode } from '@xmldom/xmldom';
import { promises } from 'fs';
import getXPathSelect from './xpath-select';
import { XPathSelect } from 'xpath';

const DomParser = new DOMParser();
const xPathSelect : XPathSelect = getXPathSelect();

export class DocumentCollector {
    doc: Document | undefined;
    insertionPoint: Node | undefined;
    readonly pathToImport: string;
    readonly parser: (text: string) => Document;
    readonly limit: number;

    /**
     *
     * @param doc a DOM populated with an XML document that will accumumlate the contents of all files
     * @param limit the number of concurrent operations
     * @param parser (optional) a function that accepts a string of XML and returns a Document (DOM). Default is DOMParser.parseFromString.
     */
    constructor(
        pathToImport: string,
        limit: number,
        parser?: (text: string) => Document
    ) {
        if (!pathToImport) {
            throw new Error("A path to select imported elements is required");
        }
        if (1 > limit || 100 < limit) {
            throw new Error("Invalid number of concurrent operations");
        }
        this.pathToImport = pathToImport;
        this.limit = limit;
        if (!parser) {
            parser = (text) => DomParser.parseFromString(text, "application/xml");
        }
        this.parser = parser;
    }
    async loadShellDocument(filePath: string, pathToParent : string) {
        const text = (await promises.readFile(filePath)).toString();
        this.doc = this.parser(text);
        const selectedParent = xPathSelect(pathToParent, this.doc as unknown as Node) as Node[];
        if (typeof selectedParent != "object" || selectedParent.length != 1) {
            throw new Error(`The xPath <${pathToParent}> selects an invalid number of elements`);
        }
        this.insertionPoint = (selectedParent)[0];
    }
    async ingestFiles(filenames: string[]) {
        const promised: Promise<Buffer>[] = [];
        const results: Buffer[] = [];
        const count = filenames.length;

        if (!this.doc) {
            throw new Error("The loadShellDocument method must be called to initialize the collector document");
        }
        //TODO the order is the contents should be the same as the order of files.
        for (let i = 0; i < count; i++) {
            if (promised.length >= this.limit) {
                await Promise.race(promised); // Allow one (or more) of the reads to complete
            }
            (() => {
                const promise = promises.readFile(filenames[i]);
                const position = i;
                promise.then((result) => results[position] = result)
                    .finally(
                        () => {
                            const index = promised.findIndex(p => p === promise);
                            promised.splice(index, 1);
                    }) // Remove the resolved promise from the array
                promised.push(promise);
            })();
        }
        if (promised.length) {
            await Promise.all(
                promised.slice(0) // Copy the array so that 'finally' handler mutation isn't visible to Promise.all
            );
        }
        results.forEach((result, i) => {
            this.addToDoc(result);
            delete results[i];
        })
    }
    addToDoc(text: Buffer<ArrayBufferLike>): DocumentCollector {
        const dom = this.parser(text.toString()) as unknown as Node;
        const frag = xPathSelect(this.pathToImport, dom) as unknown as domNode[];
        const {insertionPoint, doc} = this;

        if (!insertionPoint || !doc) {
            throw new Error("The collector hasn't been properly initialized");
        }
        frag.forEach((node) => {
            insertionPoint.appendChild(
                doc.importNode(node, true) as unknown as Node
            );
        });
        return this;
    }
}
