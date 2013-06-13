/*globals module*/

var boilerplate = function (details) {
    'use strict';

    return '<!DOCTYPE html>\n' +
        '<html xmlns="http://www.w3.org/1999/xhtml">\n' +
        '<head>\n' +
        '    <meta charset="utf-8" />\n' +
        '    <title>'+(details.title || '')+'</title>\n' +
        (details.head || '') +
        '</head>\n' +
        '<body>\n' +
        (details.top || '') +
        (details.body || '') +
        (details.bottom || '') +
        '</body>\n' +
        '</html>';
};

module.exports = boilerplate;
