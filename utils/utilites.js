
const { fetcher }  = require('../fetcher.js');

function roundToTwoPlacesTotal( num ) {
    return Math.round(num *100)/100;
}

function roundToThreePlaces( num ) {
    return Math.round(num *1000)/1000 +'%';
}

async function getHtml(url){
    const body = await fetcher(url, 'GET');
    //console.log('res ', res);
    return body;
}

module.exports = { roundToTwoPlacesTotal, getHtml, roundToThreePlaces };