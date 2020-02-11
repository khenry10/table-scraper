const tableScraper = require('table-scraper');

var request        = require('request');
const xray         = require('x-ray')();
var tabletojson    = require('tabletojson');
const cheerio      = require('cheerio');
//const winLoss    = require('./winLoss')
const winLossData  = require('./winsLossData.json');
const fs           = require('fs');

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

          console.log('str ', str);

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
           console.log('dateArr ', dateArr);
           return  resolve( dateArr );
        })
    })
};

function createAndFormatGame(game, winsAndLosses, rankings, gameDate) {
    console.log('gameDate ', gameDate);

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

function getGamesSchedule(url) {
    return new Promise(function(resolve, reject) {
        request.get(url, function(err, response, body) {
          
            if (err) {
              return reject(err);
            }
            if (response.statusCode >= 400) {
              return reject(new Error('The website requested returned an error!'));
            }

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

function combineAndProcess(scheduleOfGames, winsAndLosses, ranking, gameDate ) {
    console.log('scheduleOfGames ', scheduleOfGames);
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
initialize();


// tableScraper
//     .get('https://www.bryantbulldogs.com/sports/mlax/2018-19/teams/bryant?view=lineup&r=0&pos=')
//     .then()

