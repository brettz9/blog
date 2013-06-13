/*globals exports */
(function () {
'use strict';

function isoDateString (d) {
    function pad (n) {
        return n < 10 ? '0' + n : n;
    }
    return d.getUTCFullYear() + '-' +
        pad(d.getUTCMonth()+1) + '-' +
        pad(d.getUTCDate()) + 'T' +
        pad(d.getUTCHours()) + ':' +
        pad(d.getUTCMinutes()) + ':' +
        pad(d.getUTCSeconds()) + 'Z';
}
function formatDate (d) {
    return typeof d === 'string' ? d : isoDateString(d);
}

exports.isoDateString = isoDateString;
exports.formatDate = formatDate;

}());
