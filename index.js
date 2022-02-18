const xray         = require('x-ray')();
var tabletojson    = require('tabletojson');
const cheerio      = require('cheerio');

const fs           = require('fs');
const { fetcher }  = require('./utils/fetcher');

const { getTeamsHistoricalHomeAwayRecord } = require('./scrapers/getTeamsHistoricalHomeAwayRecord.js');

async function getHtml(url){
    const body = await fetcher(url, 'GET');
    //console.log('res ', res);
    return body;
}

function xrayer( body, cssSelector) {

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
}

/**
 * @description - reformats roster array into obj with the player# being the key
 * @param roster - [
 {
    '#': '1',
    Name: 'connor shellenberger',
    Pos: 'a',
    Yr: 'fr',
    Hometown: 'charlottesville, va',
    ....
  },
...]
 * @returns {{}} -> {
 *     '1': {
    '#': '1',
    Name: 'connor shellenberger',
    Pos: 'a',
    Yr: 'fr',
    Hometown: 'charlottesville, va',
    ...
   }
  }
 */
function formatRoster(roster) {
    const rosterObj = {};

    if ( roster.length ) {
        roster.forEach( player => {
            rosterObj[player['#']] = player;
        });
    } else {
        console.error('roster is undefined')
    }
    return rosterObj;
}

function formatStats(playerStats, roster) {
   // console.log('playerStats =', playerStats)
    if (!playerStats) throw Error('No playerStats')
    return playerStats.map( (player, playerStatsIndex) => {
        const keys = Object.keys(player);
        const values = Object.values(player);
        const newStatObj = {};

        keys.forEach( (key, i) => {
            if( key === 'Opponents') {
                newStatObj['Player #'] = values[i];
            } else if ( key === 'Player') {
                const playerInRoster = roster[newStatObj['Player #']];

                if ( playerInRoster ) {
                    newStatObj['Player'] = playerInRoster.Name;
                    newStatObj['Position'] = playerInRoster.Pos;
                    newStatObj['Yr'] = playerInRoster.Yr;
                } else {
                    if ( playerStats.length-1 === playerStatsIndex ){
                        newStatObj['Player'] = "OPPONENTS";
                    } else if (playerStats.length-2 === playerStatsIndex) {
                        newStatObj['Player'] = "TEAM";
                    } else {
                        // newStatObj['Player'] = "";
                        // newStatObj['Position'] = "";
                        // newStatObj['Yr'] = "";
                    }
                }

            } else if ( key ===  'GP-GS') {
                const splitted = values[i-1].split('-');
                newStatObj['GP'] = parseInt(splitted[0]);
                newStatObj['GS'] = parseInt(splitted[1]);
            } else {
                newStatObj[key] = values[i-1][0] === '.' ? values[i-1] : parseInt(values[i-1]);
            }
        });
        return newStatObj;
    })
}

function aggregateTeamStats(playerStats, goalieStats) {

    const teamData = {
        goals: {fr: 0, so: 0, jr: 0, sr: 0},
        assists: {fr: 0, so: 0, jr: 0, sr: 0},
        points: {fr: 0, so: 0, jr: 0, sr: 0},
        'shot-percentage': {fr: [], so: [], jr: [], sr: []},
        'shots-on-goal-percentage': {fr: [], so: [], jr: [], sr: []},
        'ground-balls': {fr: 0, so: 0, jr: 0, sr: 0},
        turnovers: {fr: 0, so: 0, jr: 0, sr: 0},
        'caused-turnovers': {fr: 0, so: 0, jr: 0, sr: 0},
        'face-offs-won': {fr: 0, so: 0, jr: 0, sr: 0},
        'face-off-percentage': {fr: [], so: [], jr: [], sr: []},
        'defense-games-played': {fr: 0, so: 0, jr: 0, sr: 0},
        'defense-games-started': {fr: 0, so: 0, jr: 0, sr: 0},
        'penalties': {fr: 0, so: 0, jr: 0, sr: 0},
        'goalie-saves': {fr: 0, so: 0, jr: 0, sr: 0},
        'goalie-save-percentage': {fr: [], so: [], jr: [], sr: []},
        'total-team-goalie-saves': 0
    };

    playerStats.forEach(player => {

        if ( player['Player #'].length && player['Yr'] ) {
            teamData['goals'][player['Yr']] += parseInt(player.G);
            teamData['assists'][player['Yr']] += parseInt(player.A);
            teamData['points'][player['Yr']] += parseInt(player.PTS);
            teamData['shot-percentage'][player['Yr']].push(player['SH%']);
            teamData['shots-on-goal-percentage'][player['Yr']].push(player['SOG%']);
            teamData['ground-balls'][player['Yr']] += parseInt(player.GB);
            teamData['turnovers'][player['Yr']] += parseInt(player.TO);
            teamData['caused-turnovers'][player['Yr']] += parseInt(player.CT);
            teamData['face-offs-won'][player['Yr']] += parseInt(player.FO);

            if ( parseFloat(player['FO%']) !== 0) {
                teamData['face-off-percentage'][player['Yr']].push(parseFloat(player['FO%']));
            }

            teamData['defense-games-played'][player['Yr']] += parseInt(player.GP);
            teamData['defense-games-started'][player['Yr']] += parseInt(player.GS);
            teamData['penalties'][player['Yr']] += parseInt(player["PN-PIM"]);
        } else {
            console.log('these players were discarded cuz they did not have a number', player['Player #'])
        }

    });
    goalieStats.forEach(goalie => {

        teamData['goalie-saves'][goalie['Yr']] += parseInt(goalie.Saves);
        teamData['total-team-goalie-saves'] += parseInt(goalie.Saves);

        if ( parseFloat(goalie['FO%']) !== 0) {
            teamData['goalie-save-percentage'][goalie['Yr']].push(parseFloat(goalie['%']));
        }
    });
    return teamData;
}

function roundToTwoPlaces( num ) {
    return Math.round(num *100)/100 + "%";
}

function roundToTwoPlacesTotal( num ) {
    return Math.round(num *100)/100;
}

function reduceTeamStats(aggregateTeamData, psuStatsTable) {
    // console.log('psuStatsTable =', psuStatsTable)
    const overallTeamStats = psuStatsTable[psuStatsTable.length-2];

    const reducedStats = {
        offense: {fr: 0, so: 0, jr: 0, sr: 0},
        'defense-start': {fr: 0, so: 0, jr: 0, sr: 0},
        'defense-played': {fr: 0, so: 0, jr: 0, sr: 0},
        'ground-balls': {fr: 0, so: 0, jr: 0, sr: 0},
        'face-offs-won': {fr: 0, so: 0, jr: 0, sr: 0},
        'face-off-percentage': {fr: 0, so: 0, jr: 0, sr: 0},
        'goalie-saves': {fr: 0, so: 0, jr: 0, sr: 0},
        'goalie-save-percentage': {fr: 0, so: 0, jr: 0, sr: 0}
    };

    for (const key in aggregateTeamData) {
        const value = aggregateTeamData[key];
        if ( key === 'points') {

            //loops through reducedStats
            for (const key in reducedStats.offense) {
                reducedStats.offense[key] =  roundToTwoPlaces((aggregateTeamData.points[key] / overallTeamStats['PTS']) *100);
                reducedStats['ground-balls'][key] = roundToTwoPlaces((aggregateTeamData['ground-balls'][key] / overallTeamStats['GB']) *100);
                reducedStats['defense-start'][key] = ( aggregateTeamData['defense-games-started'][key] );
                reducedStats['defense-played'][key] = ( aggregateTeamData['defense-games-played'][key] );
                reducedStats['face-offs-won'][key] = aggregateTeamData['face-offs-won'][key];
                reducedStats['face-off-percentage'][key] = aggregateTeamData['face-off-percentage'][key].length
                    ? roundToTwoPlaces(aggregateTeamData['face-off-percentage'][key].reduce( (acc, currentValue) => acc + parseFloat(currentValue)) / aggregateTeamData['face-off-percentage'][key].length)
                    : 0 ;
                reducedStats['goalie-save-percentage'][key] = aggregateTeamData['goalie-save-percentage'][key].length
                    ? aggregateTeamData['goalie-save-percentage'][key].reduce( (acc, currentValue) => acc + parseFloat(currentValue)) / aggregateTeamData['goalie-save-percentage'][key].length
                    : 0 ;
                reducedStats['goalie-saves'][key] = roundToTwoPlacesTotal((aggregateTeamData['goalie-saves'][key] / aggregateTeamData['total-team-goalie-saves']) *100);
            }
        }
    }

    return reducedStats;
}

function splitOutByClass( classYear, reducedStats, rankAndRecord) {
    // console.log('rankAndRecord = ', rankAndRecord)
    const returnData = {...rankAndRecord};
    for (const key1 in reducedStats)  {
        const stat = reducedStats[key1];
        for (const key in stat) {
            if (key === classYear) {
                returnData[key1] = stat[key];
            }
        }
    }
    return returnData;
}


function writeToJson( filename, data ) {
    fs.writeFile(filename, JSON.stringify( data, null, 2 ), function (err) {
        if (err) throw err;
        console.log( filename,'Saved!')
    });
}

function appendToJsonFile( filename, data ) {
    fs.appendFile(filename, JSON.stringify( data, null, 2 ), function (err) {
        if (err) throw err;
        console.log( filename,'Saved!')
    });
}

function writeToHtml( filename, data ) {
    fs.writeFile(filename, data, function (err) {
        if (err) throw err;
        console.log( filename,'Saved!')
    });
}

//getTeamsHistoricalHomeAwayRecord('gettysburg', 2007,2019);

async function getRecordAndRankFromRosterHtml( html ){
    const $ = cheerio.load(await html);

    const record = $("span:contains('Record:')").next().text();
    const rank = $("span:contains('Rank:')").next().text();

    return {rank, record};
}

/**
 *
 * @param year
 * @param teamName - should be name used on www.lax.com url params
 * @returns {{name: *, rootDomain: string, statsUrl: (string|string), rosterUrl: string, cssSelector: string}}
 */
const createTeamConfig = (year, teamName ) => {
    const
        // statsUrlPath       = `/sports/mens-lacrosse/stats/${year}#individual`,
        statsUrlPath       = `/sports/mens-lacrosse/stats/${year}`,
        goalieStatsUrlPath = `/sports/mens-lacrosse/stats/${year}#individual-overall-goalkeeping`,
        goalieCssSelector  = '#team-roster-goalie@html',
        rosterUrlPath      = `https://www.lax.com/team?url_name=${teamName}&year=${year}`,
        rosterCssSelector  = '#team-roster-main@html',
        statsCssSelector   = '.sidearm-table-overflow-on-x-large@html';

    const teams = {
        'north-carolina': {
            rootDomain: 'https://goheels.com',
            statsUrl: `https://goheels.com/sports/mens-lacrosse/stats/${year}#individual`,
        },
        'penn-state': {
            rootDomain: 'https://gopsusports.com',
            statsUrl: `https://gopsusports.com/sports/mens-lacrosse/stats/${year}#individual`,
        },
        'yale': {
            rootDomain: 'https://yalebulldogs.com',
        },
        'virginia' : {
            rootDomain: 'https://virginiasports.com',
            statsUrl: `https://static.virginiasports.com/custompages/sports/m-lacros/stats/${year}/teamcume.htm#TEAM.IND`
        },
        'maryland': {
            rootDomain: 'https://umterps.com',
        },
        'pennsylvania' : {
            rootDomain: 'https://pennathletics.com/',
        },
        'duke': {
            rootDomain: 'https://goduke.com/',
        },
        'denver': {
            rootDomain: 'https://denverpioneers.com/',
        },
        'johns-hopkins': {
            rootDomain: 'https://hopkinssports.com/',
        },
        'cornell': {
            rootDomain: 'https://cornellbigred.com/',
        },
        'loyola': {
            rootDomain: 'https://loyolagreyhounds.com/',
        },
        'army': {
            rootDomain: 'https://goarmywestpoint.com/',
        },
        'lehigh': {
            rootDomain: 'https://lehighsports.com/',
        },
        'syracuse': {
            rootDomain: 'https://cuse.com',
        }
    };

    const teamConfig = teams[teamName];
    const statsUrl = teamConfig.statsUrl || teamConfig.rootDomain + statsUrlPath;

    return {
        name: teamName,
        rootDomain: teamConfig.rootDomain,
        statsUrl,
        goalieStatsUrl: teams[teamName].rootDomain + goalieStatsUrlPath,
        rosterUrl: rosterUrlPath,
        cssSelector: statsCssSelector,
        rosterCssSelector,
        goalieCssSelector
    }
}

// @TODO add UMass
/**
 *
 * @param {string} classYr
 * @param {integer} year
 * @returns {Promise<void>}
 */
async function getTeamStats(classYr, year) {

    const teamsConfig = [
        'north-carolina',
        'penn-state',
        // 'yale', // => not working, they don't have 2021 stats posted
        // 'virginia', // => not working, => their stats url is messed up
        'maryland',
        'pennsylvania',
        'duke',
        'denver',
        'johns-hopkins',
        'cornell',
        'loyola',
        'army',
        'lehigh',
        'syracuse'
    ];

    let classData = {
        year: year,
        classStats: classYr,
        description: `For the ${year} season, the ${classYr} accounted for the following output. This is theoretically what a team is losing if it's the SR class. Need to check covid eligibility. `
    };

    await teamsConfig.forEach( async teamName => {
        console.log('starting ', teamName);
        const team = createTeamConfig(year, teamName);

        //get data
        const teamStatsBody = await getHtml(team.statsUrl);
        // console.log('teamStatsBody = ', teamStatsBody)

        const
            rosterHtml       = await getHtml(team.rosterUrl),
            teamStatsTable   = await xrayer(await teamStatsBody, team.cssSelector),
            goalieStatsTable = xrayer(await rosterHtml, team.goalieCssSelector),
            teamRosterTable  = xrayer(await rosterHtml, team.rosterCssSelector);

        const rankAndRecord = await getRecordAndRankFromRosterHtml(rosterHtml);
        rankAndRecord[`${year}-rank`] = rankAndRecord.rank;
        rankAndRecord[`${year}-record`] = rankAndRecord.record;
        delete rankAndRecord['rank']
        delete rankAndRecord['record']

        const thisYear = year+1
        const thisYearRosterUrl = team.rosterUrl.replace(year, thisYear);
        console.log('thisYearRosterUrl =', thisYearRosterUrl)
        const thisYearRosterHtml = await getHtml(thisYearRosterUrl);
        const thisYearRankAndRecord = await getRecordAndRankFromRosterHtml(thisYearRosterHtml);
        rankAndRecord[`${thisYear}-rank`] = thisYearRankAndRecord.rank;
        rankAndRecord[`${thisYear}-record`] = thisYearRankAndRecord.record;

        if (!teamStatsTable) throw Error('no teamStatsTable');

        //format data
        const
            formattedRoster    = formatRoster(await teamRosterTable),
            formattedTeamStats = formatStats(await teamStatsTable, await formattedRoster);

        //analyze data
        const aggregateTeamData = aggregateTeamStats(formattedTeamStats, await goalieStatsTable);

        //reduce data
        const reducedTeamStats = reduceTeamStats(aggregateTeamData, formattedTeamStats);

        const classSpecific = splitOutByClass(classYr, reducedTeamStats, rankAndRecord);
        // console.log('classSpecific = ', classSpecific);
        classData[team.name] = {};
        classData[team.name] = classSpecific;
        writeToJson(`data/multiple-team-stats/${year}/${classYr}Class.json`, await classData);

        reducedTeamStats.year = year;

        writeToJson('data/stats/'+team.name+'TeamStats-'+year+'.json', formattedTeamStats);
        writeToJson('data/stats/'+team.name+'ReducedStats-'+year+'.json', reducedTeamStats);
        // writeToHtml('htmlRecords/'+team.name+'Stats.html', await teamStatsBody);
        // writeToHtml('htmlRecords/'+team.name+'Roster.html', await rosterHtml);
        console.log(team.name, ' done!');
    })

}

getTeamStats('sr', 2021);

