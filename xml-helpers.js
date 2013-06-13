/*globals exports */

(function () {
'use strict';

function escapeXMLContent (str) {
    return str.replace(/&(?!amp;)/g, '&amp;').replace(/</g, '&lt;');
}

function escapeXMLAttribute (str) {
    return str.replace(/&(?!amp;)/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function indent (level) {
    return new Array((level*4)+1).join(' ');
}

function element (elem, n, content, atts) {
    return indent(n) + '<' + elem + (atts || '') + (content ? '>' + content + '</' + elem + '>' : '/>') + '\n';
}

function parent (elem, n, content, atts) {
    var ind = indent(n);
    return ind + '<' + elem + (atts || '') + '>\n' + content + ind + '</' + elem + '>\n';
}

function attribute (name, value) {
    return value ? ' ' + name + '="' + value + '"' : '';
}

function escapeAttribute (name, value) {
    return value ? ' ' + name + '="' + escapeXMLAttribute(value) + '"' : '';
}

function escapeElement (parent, elem, n) {
    return parent[elem] ? element(elem, n, escapeXMLContent(parent[elem])) : '';
}

function escapeAttributes (attArr, parent) {
    return attArr.reduce(function (prev, attr) {
        return prev + escapeAttribute(attr, parent[attr]);
    }, '');
}

exports.xmlDeclaration = '<?xml version="1.0" encoding="utf-8"?>\n';
exports.escapeXMLContent = escapeXMLContent;
exports.escapeXMLAttribute = escapeXMLAttribute;
exports.indent = indent;
exports.element = element;
exports.parent = parent;
exports.attribute = attribute;
exports.escapeAttribute = escapeAttribute;
exports.escapeElement = escapeElement;
exports.escapeAttributes = escapeAttributes;

}());
