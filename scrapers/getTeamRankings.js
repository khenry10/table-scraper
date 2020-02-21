
const tableScraper = require('table-scraper');
const fs           = require('fs');
//const { writeToJson }  = require('../utils/writeToJson.js');
const { roundToTwoPlacesTotal }  = require('../utils/utilites.js');

const  usilaCoachesPoll        = require('../mocks/usilaCoachesPoll');
const  insideLacrosseRank      = require('../mocks/insideLacrosseRank');
const  insideLacrosseTeamStats = require('../mocks/insideLacrosseTeamStats');

const writeToJson = async ( filename, data ) => {
    fs.writeFile(filename, JSON.stringify( data, null, 2 ), function (err) {
        if (err) throw err;
        console.log( filename,'Saved!')
    });
};

function formatTeamName( team ) {
    const split = r.TEAM.split(" (");
    r.SCHOOL = split[0];
    //const homeTeamRank = homeRank ? "#" + homeRank.RANK + " " : "";
    return r;f
}

function formatRankingData( rankingData ) {
    const tempObj = {};
    rankingData.forEach( teamRank => {
        const split = teamRank.TEAM.split(" (");
        teamRank.TEAM = split[0];
        teamRank.firstPlaceVotes = split.length === 2 ? parseInt( split[1].split(')')[0]) : 0;

        tempObj[teamRank.TEAM] = teamRank;
    });

    return tempObj;
}

const getTeamRankings = async() => {
 console.log('getTeamRankings called')

    const
        usilaCoachesPollUrl        = 'https://www.ncaa.com/rankings/lacrosse-men/d1/usila-coaches',
        insideLacrosseRankingsUrl  = 'https://www.ncaa.com/rankings/lacrosse-men/d1/inside-lacrosse',
        insideLacrosseTeamStatsUrl = 'https://www.insidelacrosse.com/league/di/teams/2020';


    //retrieves data
    //const
        //usilaCoachesPoll    = await tableScraper.get(usilaCoachesPollUrl),
        //insideLacrosseRank  = await tableScraper.get(insideLacrosseRankingsUrl),
        //insideLacrosseTeamStats = await tableScraper.get(insideLacrosseTeamStatsUrl);
        //htmlGamesSchedule = await getGamesSchedule(gameCalendarUrl);

    // const usilaFormattedObj = {}
    //
    // const usilaFormatted = usilaCoachesPoll[0].map( teamRank => {
    //     const split = teamRank.TEAM.split(" (");
    //     teamRank.TEAM = split[0];
    //     teamRank.firstPlaceVotes = split.length === 2 ? parseInt( split[1].split(')')[0]) : 0;
    //
    //     usilaFormattedObj[teamRank.TEAM] = teamRank;
    //
    //     return teamRank
    // });

    const usilaFormatted = formatRankingData( usilaCoachesPoll[0] );

    console.log('usilaFormatted ', usilaFormatted);

    const ilRankFormatted = formatRankingData( insideLacrosseRank[0] );

    console.log('ilRankFormatted ', ilRankFormatted);


    const combinedStats = insideLacrosseTeamStats[0].map( ilTeamStats => {

        const
            goalAgainstPerGame = roundToTwoPlacesTotal( ilTeamStats.GA / ( parseInt( ilTeamStats.W ) + parseInt(ilTeamStats.L)) ),
            goalsPerGame       = ilTeamStats.GPP,
            goalsDiffPerGame   = goalsPerGame - goalAgainstPerGame;

        ilTeamStats['WINS']                   = ilTeamStats.W;
        ilTeamStats['LOSSES']                 = ilTeamStats.L;
        ilTeamStats['GOALS']                  = ilTeamStats.G;
        ilTeamStats['GOALS AGAINST']          = ilTeamStats.GA;
        ilTeamStats['GOALS DIFF']             = ilTeamStats.DIFF;
        ilTeamStats['GOALS PER GAME']         = goalsPerGame;
        ilTeamStats['GOALS AGAINST PER GAME'] = goalAgainstPerGame;
        ilTeamStats['GOALS DIFF PER GAME']    = goalsDiffPerGame;

        delete ilTeamStats['W'];
        delete ilTeamStats['L'];
        delete ilTeamStats['GA'];
        delete ilTeamStats['G'];
        delete ilTeamStats['DIFF'];
        delete ilTeamStats['GPP'];

        ilTeamStats['IL RANK'] = ilRankFormatted[ilTeamStats.Team] ? ilRankFormatted[ilTeamStats.Team].RANK : "-";
        ilTeamStats['IL First Place Votes'] = ilRankFormatted[ilTeamStats.Team] ? ilRankFormatted[ilTeamStats.Team].firstPlaceVotes : 0;
        ilTeamStats['IL Rank Points'] = ilRankFormatted[ilTeamStats.Team] ? ilRankFormatted[ilTeamStats.Team].POINTS : 0;
        ilTeamStats['IL Previous Points'] = ilRankFormatted[ilTeamStats.Team] ? ilRankFormatted[ilTeamStats.Team].PREVIOUS : '-';

        ilTeamStats['USILA RANK'] = usilaFormatted[ilTeamStats.Team] ? usilaFormatted[ilTeamStats.Team].RANK : "-";
        ilTeamStats['USILA First Place Votes'] = usilaFormatted[ilTeamStats.Team] ? usilaFormatted[ilTeamStats.Team].firstPlaceVotes : 0;
        ilTeamStats['USILA Rank Points'] = usilaFormatted[ilTeamStats.Team] ? usilaFormatted[ilTeamStats.Team].POINTS : 0;
        ilTeamStats['USILA Previous Rank'] = usilaFormatted[ilTeamStats.Team] ? usilaFormatted[ilTeamStats.Team].PREVIOUS : '-';

        return ilTeamStats;
    })

    //cleans & processes data
    //const ranking           = normalizeSchoolName(await rankingData[0]);

    //const data = [].concat.apply([], await scheduleOfGames);

    //writeToJson('mocks/usilaCoachesPoll.json', await usilaCoachesPoll);
    //writeToJson('mocks/insideLacrosseRank.json', await insideLacrosseRank);
    //writeToJson('mocks/insideLacrosseTeamStats.json', await insideLacrosseTeamStats);
    writeToJson('mocks/combinedStats.json', await combinedStats);

};

module.exports = {
    getTeamRankings
};