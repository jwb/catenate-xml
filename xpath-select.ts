import * as xpath from 'xpath';
import { defaultNamespace } from './config';

export default function getXPathSelect() {
    return defaultNamespace ? xpath.useNamespaces({ kml: defaultNamespace }) : xpath.select;
}
