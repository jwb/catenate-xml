import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import getXPathSelect from "./xpath-select";
import * as xpath from "xpath";

const configBehavior = vi.hoisted(() => {
    let value: string | undefined;

    return {
        getValue() { 
            return value;
        },
        setValue(v: string | undefined) { 
            value = v;
        }
    }
});

vi.mock("xpath");
vi.mock("./config", () => {
    return {
        get defaultNamespace() : string | undefined {
            return configBehavior.getValue();
        }
    }
});

describe("xPathSelect", () => {

    beforeEach(() => {
        configBehavior.setValue("DUMMY_VALUE");
    });
    afterEach(() => {
        vi.resetAllMocks();
    });
    it("calls useNamespaces and returns the configured select method", () => {
        const probe = {} as xpath.XPathSelect;

        vi.mocked(xpath.useNamespaces).mockReturnValue(probe);
        expect(getXPathSelect()).toBe(probe);
        expect(xpath.useNamespaces).toBeCalled();
    });

    it("doesn't call useNamespaces if the namespace option is empty; returns the base select method", () => {
        configBehavior.setValue("");

        expect(getXPathSelect()).toBe(xpath.select);
        expect(xpath.useNamespaces).not.toBeCalled();
    })
})