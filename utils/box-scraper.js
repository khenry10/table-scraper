var request = require('request');
const xray  = require('x-ray')();

function boxScraper(url, htmlParser, htmlSelector = ['.box@html']) {
    console.log('url = ', url);
    console.log('htmlParser = ', htmlParser);
    return new Promise(function(resolve, reject) {
        //request.get returns the HTML text of the page
        request.get(url, function(err, response, body) {

            if (err) {
                console.log('err ', err);
                return reject(err);
            }
            if (response.statusCode >= 400) {
                return reject(new Error('The website requested returned an error!'));
            }
            // console.log('body ', body)
            xray(body, htmlSelector)(function (conversionError, tableHtmlList) {
                if (conversionError) {
                    console.log("conversionError = ", conversionError);
                    return reject(conversionError);
                }

                // console.log('tableHtmlList =', tableHtmlList)

                if(htmlParser) {
                    return resolve(htmlParser(body))
                }

                return resolve(tableHtmlList);
            });
        })
    });
}

module.exports = { boxScraper };
