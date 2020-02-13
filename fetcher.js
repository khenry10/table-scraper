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

    console.log( url," fetchOptions = ", fetchOptions[httpVerb], " and payload = ", payload );
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
            //console.log('parsedRes = ', parsedRes);
            //parsedRes is one big object that we turn into an array
            // return Object.entries( parsedRes ).map(
            //     ( [key, value] ) => {
            //         if( value ){
            //             value['key'] = key;
            //         }
            //         return value;
            //     }
            // );

            return parsedRes;

        });

};

module.exports = {
    fetcher
};
