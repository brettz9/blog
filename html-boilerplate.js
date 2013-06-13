var boilerplate = function (details) {

    return '<!DOCTYPE html>\n' +
'<html xmlns="http://www.w3.org/1999/xhtml">\n' +
'<head>\n' +
'    <meta charset="utf-8" />\n' +
'    <title>'+(details.title || '')+'</title>\n' +
(details.head || '') +
'</head>\n' +
'<body>\n' +
(details.body || '') +
'</body>\n' +
'</html>';

};


module.exports = boilerplate;