//const { createResponse } = require("./utility");

const fetch = require('node-fetch');


const stringIt = payload => {
    return JSON.stringify( payload )
};


const fetchOptions = {
    GET: { method: 'GET' },
    POST: { method: 'POST'},
    PUT: { method: 'PUT' },
    DELETE: { method: 'DELETE' },
    PATCH: { method: 'PATCH'}
};

const fetcher = async function( url, httpVerb, payload ){
    console.log('fetcher url ', url);
    if( !httpVerb ){
        httpVerb = 'GET'
    }

    if( payload ){
        fetchOptions[httpVerb]['body'] = stringIt( payload );
    }

    console.log( url," fetchOptions = ", fetchOptions[httpVerb]);
    //console.trace("API call")

    return fetch( url, fetchOptions[httpVerb] )
        .then( res => {
            //console.log('res = ', res.text())
            return res.text()
            //return res.json()
        })
        .catch( err => {
            console.log("err = ", err)
            return err })
        .then( parsedRes => {
            console.log('Success calling ', url);
            if( !parsedRes ){
                return
            }
            return parsedRes;

        });

};

async function getHtml(url){
    const body = await fetcher(url, 'GET');
    return body;
}

module.exports = {
    fetcher,
    getHtml
};
