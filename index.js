const tableScraper = require('table-scraper');

var request        = require('request');
const xray         = require('x-ray')();
var tabletojson    = require('tabletojson');
const cheerio      = require('cheerio');
//const winLoss    = require('./winLoss')
const winLossData  = require('./winsLossData.json');
const fs           = require('fs');
const https         = require("https");
const { fetcher } = require('./fetcher.js');

/**
 * @description method used to take body html and create an array of dates for the weekend games
 * @param {HTML} body 
 * @returns array of dates for that weekend's games
 **/
function createArrOfDate (body) {
    return new Promise(function(resolve, reject) {
      return xray(body, ['.box@html'])(function (conversionError, tableHtmlList) {

          const $   = cheerio.load(body);
          const str = $("h4").text();
          let str2  = "";

          for ( let i = 0; i < str.length; i++ ) {

            if ( !parseInt( str[i] ) ) {
              str2 += str[i]
            } else {
              // looks to see if the character after a number is another number
              if ( !isNaN( parseInt( str[i +1] ) ) ){
                str2 += str[i].toString() + str[i+1].toString() + ";"
                // need the below because the "5" of "15" was being added as its own element in the array
                i = i+1
              } else {
                str2 += str[i] + ";"
              }
  
            }
          }
           const dateArr = str2.split(";");
           return  resolve( dateArr );
        })
    })
}

function createAndFormatGame(game, winsAndLosses, rankings, gameDate) {
    const Home = winsAndLosses.find( r => r.Team === game.Home );
    const Away = winsAndLosses.find( r => r.Team === game.Away );

    let homeRank, awayRank;

    rankings.forEach( r => {
        if ( r.SCHOOL == Home.Team ){
            homeRank = r;
        } else if ( r.SCHOOL == Away.Team ){
            awayRank = r;
        }
    });

    const homeTeamRank = homeRank ? "#" + homeRank.RANK + " " : "";
    const awayTeamRank = awayRank ? "#" + awayRank.RANK + " " : "";

    game.date =  gameDate;
    game.Home =  homeTeamRank + game.Home + " ("+ Home['W']  +"-"+ Home['L']  +")";
    game.Away =  awayTeamRank + game.Away + " ("+ Away['W']  +"-"+ Away['L']  +")";
    game.timestamp = new Date();
    return game
}

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

// {
//     "Opponents": "1",
//     "Player": "2-2",
//     "GP-GS": "7",
//     "G": "11",
//     "A": "18",
//     "PTS": "16",
//     "SH": ".438",
//     "SH%": "10",
//     "SOG": ".625",
//     "SOG%": "0",
//     "UP": "0",
//     "DWN": "2",
//     "GB": "5",
//     "TO": "0",
//     "CT": "0-0",
//     "FO": ".000",
//     "FO%": "0-00:00",
//     "PN-PIM": "View Bio"
// },
function formatStats(playerStats, roster) {

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

function getGamesSchedule(url) {
    console.log('url = ', url);
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
            console.log('body ', body)
            xray(body, ['.box@html'])(function (conversionError, tableHtmlList) {
                if (conversionError) {
                    console.log("conversionError = ", conversionError);
                    return reject(conversionError);
                }
                return resolve(tableHtmlList);
            });
        })
    });
}

/**
 * @description cleans data - creates 'SCHOOL' attribute which strips away the number of 1st place votes.  so team: 'Penn State (13)'
 * becomes school: 'Penn State'
 * @param teamRankings Obj []; [ { RANK: '1', TEAM: 'Penn State (11)', POINTS: '385' }]
 * @returns Obj [] ;  [{ RANK: '1', TEAM: 'Penn State (11)', POINTS: '385', SCHOOL: 'Penn State'
  }]
 */
function normalizeSchoolName( teamRankings ) {
    return teamRankings.map( r => {
        const split = r.TEAM.split(" (");
        r.SCHOOL = split[0];
        //const homeTeamRank = homeRank ? "#" + homeRank.RANK + " " : "";
        return r;
    });
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

function combineAndProcess(scheduleOfGames, winsAndLosses, ranking, gameDate ) {
    return scheduleOfGames.map( (game) => {
        return createAndFormatGame(game, winsAndLosses, ranking, gameDate);
    });
}

async function getGameDates(html) {

    const
        scheduleOfGames = tabletojson.convert('<table>' + html[0] + '</table>')[0],
        dates           = await createArrOfDate(html[0]);

    return await dates;
}

function schedulerMapper(table, index, winsAndLosses, ranking, gameDate ) {
    const scheduleOfGames = tabletojson.convert('<table>' + table + '</table>')[0];

    //conversion creates duplicate of the first table of dates
    if ( index === 0 ) {
        return '';
    }
    return combineAndProcess(scheduleOfGames, winsAndLosses, ranking, gameDate);
}

/**
 *  @description fusing together 3 different data points.  1) Team Records (wins/losses) 2) Team Rank 3) Team Schedule and home/away team
 *  @returns {JSON} file
 */
async function initialize() {

    const
        teamsRecordUrl    = 'https://www.insidelacrosse.com/league/di/teams/19',
        teamRankingsUrl   = 'https://www.ncaa.com/rankings/lacrosse-men/d1/inside-lacrosse',
        gameCalendarUrl   = 'https://www.insidelacrosse.com/league/di/calendar/19';

    //retrieves data
    const
        winsAndLosses     = await tableScraper.get(teamsRecordUrl),
        rankingData       = await tableScraper.get(teamRankingsUrl),
        htmlGamesSchedule = await getGamesSchedule(gameCalendarUrl);

    //cleans & processes data
    const
        ranking           = normalizeSchoolName(await rankingData[0]),
        gameDates         = await getGameDates(htmlGamesSchedule),
        scheduleOfGames   = htmlGamesSchedule.map( (table,  i) => { return schedulerMapper(table, i, winsAndLosses[0], ranking, gameDates[i-1])});

    const data = [].concat.apply([], await scheduleOfGames);

    writeToJson('lax-calendar-init.json', data);
}
//initialize();

async function getRecordAndRankFromRosterHtml( html ){
    const $ = cheerio.load(await html);

    const record = $("span:contains('Record:')").next().text();
    const rank = $("span:contains('Rank:')").next().text();

    return {rank, record};
}

async function getTeamStats() {

    const
        statsUrlPath       = '/sports/mens-lacrosse/stats/2020#individual',
        goalieStatsUrlPath = '/sports/mens-lacrosse/stats/2020#individual-overall-goalkeeping',
        goalieCssSelector  = '#team-roster-goalie@html',
        rosterUrlPath      = 'https://www.lax.com/team?url_name=TEAM_NAME&year=2020',
        rosterCssSelector  = '#team-roster-main@html',
        statsCssSelector   = '.sidearm-table-overflow-on-x-large@html';

    const psu = {
        name: 'psu',
        rootDomain: 'https://gopsusports.com',
        statsUrl:'https://gopsusports.com/sports/mens-lacrosse/stats/2020#individual',
        rosterUrl: 'https://www.lax.com/team?url_name=penn-state&year=2020',
        cssSelector: '.sidearm-table-overflow-on-x-large@html'
    };

    const yale = {
        name: 'yale',
        rootDomain: 'https://yalebulldogs.com',
        statsUrl: 'https://yalebulldogs.com/sports/mens-lacrosse/stats/2020',
        rosterUrl: 'https://www.lax.com/team?url_name=yale&year=2020',
        cssSelector: '.sidearm-table-overflow-on-x-large@html'
    };

    const uva = {
        name: 'uva',
        rootDomain: 'https://virginiasports.com',
        statsUrl: 'https://virginiasports.com/sports/mens-lacrosse/stats/2020',
        rosterUrl: 'https://www.lax.com/team?url_name=virginia&year=2020',
        cssSelector: '.sidearm-table-overflow-on-x-large@html'
    };

    const maryland = {
        name: 'maryland',
        rootDomain: 'https://umterps.com',
        statsUrl: 'https://umterps.com' + statsUrlPath ,
        rosterUrl: rosterUrlPath.replace('TEAM_NAME', 'maryland'),
        cssSelector: statsCssSelector,
    };

    const syracuse = {
        name: 'syracuse',
        rootDomain: 'https://cuse.com',
        statsUrl: 'https://cuse.com' + statsUrlPath ,
        rosterUrl: rosterUrlPath.replace('TEAM_NAME', 'syracuse'),
        cssSelector: statsCssSelector,
    };

    const uPenn = {
        name: 'uPenn',
        rootDomain: 'https://pennathletics.com/',
        statsUrl: 'https://pennathletics.com/' + statsUrlPath ,
        rosterUrl: rosterUrlPath.replace('TEAM_NAME', 'pennsylvania'),
        cssSelector: statsCssSelector,
    };

    const duke = {
        name: 'duke',
        rootDomain: 'https://goduke.com/',
        statsUrl: 'https://goduke.com/' + statsUrlPath ,
        rosterUrl: rosterUrlPath.replace('TEAM_NAME', 'duke'),
        cssSelector: statsCssSelector,
    };

    const denver = {
        name: 'denver',
        rootDomain: 'https://denverpioneers.com/',
        statsUrl: 'https://denverpioneers.com/' + statsUrlPath ,
        rosterUrl: rosterUrlPath.replace('TEAM_NAME', 'denver'),
        cssSelector: statsCssSelector,
    };

    const hopkins = {
        name: 'hopkins',
        rootDomain: 'https://hopkinssports.com/',
        statsUrl: 'https://hopkinssports.com/' + statsUrlPath ,
        rosterUrl: rosterUrlPath.replace('TEAM_NAME', 'johns-hopkins'),
        cssSelector: statsCssSelector,
    };

    const cornell = {
        name: 'cornell',
        rootDomain: 'https://cornellbigred.com/',
        statsUrl: 'https://cornellbigred.com/' + statsUrlPath ,
        rosterUrl: rosterUrlPath.replace('TEAM_NAME', 'cornell'),
        cssSelector: statsCssSelector,
    };

    const loyola = {
        name: 'loyola',
        rootDomain: 'https://loyolagreyhounds.com/',
        statsUrl: 'https://loyolagreyhounds.com/' + statsUrlPath ,
        rosterUrl: rosterUrlPath.replace('TEAM_NAME', 'loyola'),
        cssSelector: statsCssSelector,
    };


    //const teams = [psu];
    const teams = [psu, yale, uva, uPenn, loyola, hopkins, cornell, denver, duke, syracuse, maryland];
    //const teams = [uPenn];
    //const year = 2019;
    const year = 2020;
    const classYr = 'fr';

    let classData = {
        year: year,
        classStats: classYr,
        psu: {}, yale: "", uva: "", uPenn: "", loyola: "", hopkins: "", cornell: "", denver: "", duke: "", syracuse: "", maryland: ""
    };

    await teams.forEach( async team => {
        console.log('starting ', team.name);
        //urls
        const
            statsUrl       = team.statsUrl.replace('2020', year),
            goalieStatsUrl = team.rootDomain + goalieStatsUrlPath.replace('2020', year),
            rosterUrl      = team.rosterUrl.replace('2020', year);

        //get data
        const
            teamStatsBody    = await getHtml(statsUrl),
            rosterHtml       = await getHtml(rosterUrl),
            teamStatsTable   = xrayer(await teamStatsBody, team.cssSelector),
            goalieStatsTable = xrayer(await rosterHtml, goalieCssSelector),
            teamRosterTable  = xrayer(await rosterHtml, rosterCssSelector);

        const rankAndRecord = await getRecordAndRankFromRosterHtml(rosterHtml);

        //format data
        const
            formattedRoster    = formatRoster(await teamRosterTable),
            formattedTeamStats = formatStats(await teamStatsTable, await formattedRoster);

        //analyze data
        const aggregateTeamData = aggregateTeamStats(formattedTeamStats, await goalieStatsTable);

        //reduce data
        const reducedTeamStats = reduceTeamStats(aggregateTeamData, formattedTeamStats);

        const classSpecific = splitOutByClass(classYr, reducedTeamStats, await rankAndRecord);
        console.log('classSpecific = ', classSpecific);
        classData[team.name] = classSpecific;
        writeToJson('data/multipleTeamStatsBy'+classYr+'Class'+year+'.json', await classData);

        reducedTeamStats.year = year;

        writeToJson('data/'+team.name+'TeamStats-'+year+'.json', formattedTeamStats);
        writeToJson('data/'+team.name+'ReducedStats-'+year+'.json', reducedTeamStats);
        writeToHtml('htmlRecords/'+team.name+'Stats.html', await teamStatsBody);
        writeToHtml('htmlRecords/'+team.name+'Roster.html', await rosterHtml);
        console.log(team.name, ' done!');
    })

}

getTeamStats();

