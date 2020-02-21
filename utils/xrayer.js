
const xray         = require('x-ray')();
var tabletojson    = require('tabletojson');

const xrayer = ( body, cssSelector) => {

    return new Promise(function(resolve, reject) {
        xray(body, cssSelector)(function (conversionError, tableHtmlList) {
            if (conversionError) {
                console.log("conversionError = ", conversionError);
                return reject(conversionError);
            }

            const table = tabletojson.convert('<table>' + tableHtmlList + '</table>')[0];

            return resolve(table);
        });
    })
};

module.exports = { xrayer }