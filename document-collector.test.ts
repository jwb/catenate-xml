import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { SelectedValue } from "xpath";
import { promises } from "fs";
import { Document } from "@xmldom/xmldom";
import { DocumentCollector } from "./document-collector";

vi.mock("fs");
vi.mock("./xpath-select", () => {
    return {
        default: () => {
            return ((_p1: any, p2: any) => staticMock.getValue(p2));
        }
    }
});

const staticMock = vi.hoisted(() => {
    const ONE_ENTRY_FAKE = [{}] as unknown as SelectedValue;
    let value: SelectedValue | undefined = ONE_ENTRY_FAKE;

    return {
        setValue(v?: Array<any>) {
                value = v as unknown as SelectedValue;
        },
        getValue(parm?) {
            return value || parm && [parm];
        },
        setDefault() {
            this.setValue(ONE_ENTRY_FAKE);
        }
    }
})

describe("DocumentCollector", () => {
    const XPATH_PARENT_PROBE = "//parent";
    const XPATH_IMPORT_PROBE = "//import";
    const FILENAME_PROBE = "./fake";
    const DOCUMENT_MOCK = vi.fn((content?) => {
        return {
            _entries: [],
            content,
            appendChild(node: any) {
                this._entries.push(node)
            },
            importNode(node: any) {return node},
        };
    });
    const parser: (text: string) => Document = DOCUMENT_MOCK as any;
    const CONTENTS_FAKE = "fake file contents";
    const readFileMocked = vi.mocked(promises.readFile);

    async function prepTheCollector(limit = 5) {
        const cut = new DocumentCollector(XPATH_IMPORT_PROBE, limit, parser);

        await cut.loadShellDocument(FILENAME_PROBE, XPATH_PARENT_PROBE);
        return cut;
    }
    beforeEach(() => {
        readFileMocked.mockResolvedValue(Buffer.from(CONTENTS_FAKE));
    })
    afterEach(() => {
        vi.resetAllMocks();
    });
    describe("constructor", () => {
        beforeEach(() => {
            staticMock.setDefault();
        });
        it("creates an instance", () => {
            expect(new DocumentCollector(XPATH_IMPORT_PROBE, 5)).toBeInstanceOf(DocumentCollector);
        });
        it("requires an import path", () => {
            expect(() => new DocumentCollector(null!, 5)).to.throw(/import.+required/);
        });
        it("requires at least one concurrent operation", () => {
            expect(() => new DocumentCollector(XPATH_IMPORT_PROBE, 0)).to.throw(/invalid.+concurrent/i);
        });
        it("requires concurrent operations be limited to no more than 100", () => {
            expect(() => new DocumentCollector(XPATH_IMPORT_PROBE, 101)).to.throw(/invalid.+concurrent/i);
        });
    });
    describe("loadShellDocument", () => {
        it("reads the specifed file", async () => {
            await prepTheCollector();

            expect(promises.readFile).toHaveBeenCalledExactlyOnceWith(FILENAME_PROBE);
        });
        it("parses the specfied file", async () => {
            const DOM_FAKE = {};
            vi.mocked(parser).mockReturnValue(DOM_FAKE as unknown as Document);

            const result = await prepTheCollector();

            expect(parser).toHaveBeenCalledExactlyOnceWith(CONTENTS_FAKE);
            expect(result.doc).toBe(DOM_FAKE);
        });
        it("throws an error if there's no node to append childron to", async () => {
            staticMock.setValue([]);

            await expect(prepTheCollector).rejects.toThrow(/invalid.+number/);
        });
        it("throws an error if more than one node is selected to append children to", async () => {
            staticMock.setValue([{}, {}]);

            await expect(prepTheCollector).rejects.toThrow(/invalid.+number/);
        });
    });
    describe("addToDoc", () => {
        it("aborts if the instance isn't initialized", () => {
            const cut = new DocumentCollector(XPATH_IMPORT_PROBE, 1, parser);
            expect(() => cut.addToDoc(Buffer.from("dummy"))).toThrow(/initialized/);
        })
    })
    describe("ingestFiles", () => {
        function testReading(fileCount: number, reverse = false) {
            return async () => {
                staticMock.setValue();
                const cut = await prepTheCollector();
                const filenames: Array<string> = [];
                
                for (let i = 0; i < fileCount; i++) {
                    filenames.push(FILENAME_PROBE + i);
                }
                expect(promises.readFile).toHaveBeenCalledOnce();
        
                if (reverse) {
                    for (let c = fileCount; c--;) {
                        readFileMocked.mockReturnValueOnce(new Promise(resolve => 
                            setTimeout(() => resolve("" + (fileCount - c)), c)
                        ));
                    }
                } else {
                    for (let c = 0; c < fileCount; c++) {
                        readFileMocked.mockReturnValueOnce(new Promise(resolve =>
                            resolve("" + c)
                        ))
                    }
                }
                expect(await cut.ingestFiles(filenames)).toHaveResolved;
                filenames.forEach(name => {
                    expect(promises.readFile).toHaveBeenCalledWith(name);
                });
                expect(parser).toHaveBeenCalledTimes(filenames.length + 1);
                expect(cut.doc).toBeTruthy();
                let prev = -1;
                cut.doc!["_entries"].forEach(({content}) => {
                    const v = parseInt(content);
                    expect(v).toBeGreaterThan(prev);
                    prev = v;
                });
            };
        }

        beforeEach(() => {
            staticMock.setValue([DOCUMENT_MOCK()]);
            vi.mocked(parser).mockClear();
        })
        it("requires a document to be loaded", async () => {
            await expect(() => new DocumentCollector(XPATH_IMPORT_PROBE, 5).ingestFiles([FILENAME_PROBE])).rejects.toThrow(/loadShellDocument.+must/);
        });
        it("doesn't do anything if there are no files", async () => {
            const cut =  await prepTheCollector();
            expect(promises.readFile).toHaveBeenCalledOnce();

            expect(await cut.ingestFiles([])).toHaveResolved
            expect(promises.readFile).toHaveBeenCalledOnce();
        });
        it("reads each file", testReading(5));
        it("handles more documents than concurrent requests", testReading(10));
        it("populates the document in the same order as the files", testReading(5, true));
    });
});

