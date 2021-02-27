
const tableScraper = require('table-scraper');
const fs           = require('fs');

const {
    roundToTwoPlacesTotal,
    roundToThreePlaces,
    getHtml
}                 = require('../utils/utilites.js');
const { xrayer }       = require('../utils/xrayer.js');
const  { writeToJson } = require('../utils/writeToJson');

const  usilaCoachesPoll        = require('../mocks/usilaCoachesPoll');

const seasonResults = {
'Overall Record': 0,
'Home Loss'   : 0,
'Home Win'   : 0,
'Away Loss'   : 0,
'Away Win'   : 0,
'Away Record'   : 0,
'Home Record'   : 0,
'Home Win Pct'   : 0,
'Away Win Pct'   : 0,
'Overall Win Pct'   : 0,
};

function formatOverallRecord(wins, losses) {

}

function formatRecordData( schedule ) {

    schedule.forEach( game => {

        const opponent = game['1'];
        const outcome  = game['2'];

        if ( opponent[0] === '@') {

            if ( outcome === 'W' ) {
                seasonResults['Away Win'] = seasonResults['Away Win'] += 1;
            } else {
                seasonResults['Away Loss'] = seasonResults['Away Loss'] += 1;
            }

        } else {

            if ( outcome === 'W' ) {
                seasonResults['Home Win'] = seasonResults['Home Win'] += 1;
            } else {
                seasonResults['Home Loss'] = seasonResults['Home Loss'] += 1;
            }
        }

        const overallWins  = parseInt(seasonResults['Home Win']) + parseInt(seasonResults['Away Win']);
        const overallLosses = parseInt(seasonResults['Home Loss']+ seasonResults['Away Loss']);

        seasonResults['Overall Record'] = overallWins + '-' + overallLosses;

        seasonResults['Home Record'] = seasonResults['Home Win'] + '-' + seasonResults['Home Loss'];
        seasonResults['Home Win Pct'] = roundToThreePlaces(seasonResults['Home Win'] / ( seasonResults['Home Win'] + seasonResults['Home Loss']));

        seasonResults['Away Record'] = seasonResults['Away Win'] + '-' + seasonResults['Away Loss'];
        seasonResults['Away Win Pct'] = roundToThreePlaces(seasonResults['Away Win'] / ( seasonResults['Away Win'] + seasonResults['Away Loss']));

        seasonResults['Overall Win Pct'] = roundToThreePlaces(overallWins / ( overallWins + overallLosses));
});

    return seasonResults;
}

async function run(url, cssSeletor) {
    const teamScheduleBody = await getHtml(url);
    const teamScheduleTable = xrayer(teamScheduleBody, cssSeletor);
    const formattedResults = formatRecordData(await teamScheduleTable);
    return await formattedResults;
    writeToJson('data/historical/dukeRecord.json', formattedResults);
}

const urls = {
    duke: 'https://www.lax.com/team?url_name=duke&team_id=13&year=2019',
    hopkins: 'https://www.lax.com/team?url_name=johns-hopkins&team_id=21&year=2007',
    unc: 'https://www.lax.com/team?url_name=north-carolina&year=2007',
    uPenn: 'https://www.lax.com/team?url_name=pennsylvania&team_id=35&year=2019',
    'penn-state': 'https://www.lax.com/team?url_name=penn-state&team_id=34&year=2019',
    yale: 'https://www.lax.com/team?url_name=yale&year=2019',
    army: 'https://www.lax.com/team?url_name=army&team_id=3&year=2019',
    syracuse: 'https://www.lax.com/team?url_name=syracuse&team_id=44&year=2019',
    salisbury: 'https://www.lax.com/team?url_name=salisbury&team_id=212&year=2019',
    gettysburg: 'https://www.lax.com/team?url_name=gettysburg&year=2019'
}

const getTeamsHistoricalHomeAwayRecord = async( teamName, firstYear, lastYear ) => {
    console.log('getTeamsHistoricalHomeAwayRecord called');

    let teamUrl = urls[teamName];
    const scheduleCssSelector = '.w-100@html';

    //2007-2019.  Lax.com is messed up.  Brings up the Drexel page for Duke 2006
    let results;
    for( let year = firstYear; year <=lastYear; year++) {
        const url = teamUrl.replace('2019', year);
        results = await run(url, scheduleCssSelector)
    }

    writeToJson('data/historical/'+teamName+'Record'+firstYear+ '-' +lastYear+'.json', results);

};

module.exports = {
    getTeamsHistoricalHomeAwayRecord
};