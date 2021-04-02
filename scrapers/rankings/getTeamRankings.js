
const tableScraper = require('table-scraper');
const fs           = require('fs');
const _            = require('lodash');
const ilModel = require('./models/insideLacrosseRankModel');
const { roundToTwoPlacesTotal }  = require('../../utils/utilites');

const  usilaCoachesPoll        = require('../../mocks/usilaCoachesPoll');
const  insideLacrosseRank      = require('../../mocks/insideLacrosseRank');
const  insideLacrosseTeamStats = require('../../mocks/insideLacrosseTeamStats');

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


/**
 *
 * @param rankingData  { Rank: '1', Team: 'Duke (5 - 0)', Points: '416 (10)', Prev: '1' }
 * @param teamKey 'Team'
 * @returns {{}}
 */
function formatRankingData( rankingData, teamKey ) {
    const tempObj = {};
    const formattedRankings = rankingData.map( teamRank => {
        console.log('teamRank', teamRank);

        const { Points } = teamRank;

        //Team: 'Duke (5 - 0)'
        const [teamName, record] = teamRank[teamKey].split(" ("); // ['Duke', '5-0)']
        console.log(teamRank[teamKey].split(" ("))
        // const teamName = teamAndRecordString[0];
        // const record = teamAndRecordString[1];
        teamRank.team = teamName;
        teamRank.record = record;

        // Points: '416 (10)'
        const totalPointsAndFirstPlaceVotes = Points.split('('); // [416, '10)']
        teamRank.points = parseInt( totalPointsAndFirstPlaceVotes[0]); // 416

        const firstPlaceVotes = totalPointsAndFirstPlaceVotes[1]; //'10)'
        teamRank.firstPlaceVotes = firstPlaceVotes ? firstPlaceVotes.split(')')[0] : 0;
        return teamRank;
        tempObj[_.lowerCase(teamRank[teamKey])] = teamRank;
    });

    return formattedRankings;
    return tempObj;
}

const getTeamRankings = async() => {
 console.log('getTeamRankings called')

    const
        usilaCoachesPollUrl        = 'https://usila.org/sports/2021/2/15/mlax2021WK2polld1.aspx',
        insideLacrosseRankingsUrl  = 'https://www.insidelacrosse.com/league/DI/polls',
        insideLacrosseTeamStatsUrl = 'https://www.insidelacrosse.com/league/di/teams/2021';


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

async function getInsideLacrosseRankings(url) {
    //const insideLacrosseRank  = await tableScraper.get(url);

    const ilRankFormatted = insideLacrosseRank[0].map((teamRankData) => {
        const { Team, Rank, Points, Prev} = teamRankData;
        return new ilModel(Team, Rank, Points, Prev).toJson();
    });
    console.log('ilRankFormatted', ilRankFormatted);
    // writeToJson('mocks/insideLacrosseRank.json', await insideLacrosseRank);
    return ilRankFormatted;
}


module.exports = {
    getTeamRankings,
    getInsideLacrosseRankings
};
