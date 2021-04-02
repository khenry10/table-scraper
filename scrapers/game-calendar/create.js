const tableScraper = require('table-scraper');
const { boxScraper } = require('../../utils/box-scraper');
const xray         = require('x-ray')();
var request        = require('request');
var tabletojson    = require('tabletojson');
const cheerio      = require('cheerio');
const  { writeToJson } = require('../../utils/writeToJson');

function createAndFormatGame(game, winsAndLosses, rankings, gameDate) {
    const Home = winsAndLosses.find( r => r.Team === game.Home );
    let Away = winsAndLosses.find( r => r.Team === game.Away );

    console.log('game ', game);
    console.log('winsAndLosses ', winsAndLosses);
    console.log('Away ', Away);
    console.log('rankings 2 ', rankings);
    let homeRank, awayRank;

    if ( !Away ) {
        Away = {}
    }

    rankings.forEach( r => {
        // console.log('r = ', r)
        if ( r.SCHOOL == Home.Team ){
            homeRank = r;
        } else if ( r.SCHOOL == Away.Team ){
            awayRank = r;
        }
    });

    const homeTeamRank = homeRank ? "#" + homeRank.Rank + " " : "";
    const awayTeamRank = awayRank ? "#" + awayRank.Rank + " " : "";

    game.date =  gameDate;
    game.Home =  homeTeamRank + game.Home + " ("+ Home['W']  +"-"+ Home['L']  +")";
    game.Away =  awayTeamRank + game.Away + " ("+ Away['W']  +"-"+ Away['L']  +")";
    game.timestamp = new Date();
    return game
}

function combineAndProcess(scheduleOfGames, winsAndLosses, ranking, gameDate ) {
    return scheduleOfGames.map( (game) => {
        return createAndFormatGame(game, winsAndLosses, ranking, gameDate);
    });
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
 * @description cleans data - creates 'SCHOOL' attribute which strips away the number of 1st place votes.  so team: 'Penn State (13)'
 * becomes school: 'Penn State'
 * @param teamRankings Obj []; [ { RANK: '1', TEAM: 'Penn State (11)', POINTS: '385' }]
 * @returns Obj [] ;  [{ RANK: '1', TEAM: 'Penn State (11)', POINTS: '385', SCHOOL: 'Penn State'
  }]
 */
function normalizeSchoolName( teamRankings ) {
    console.log('teamRankings', teamRankings);
    return teamRankings.map( r => {
        if ( r.Team ) {
            const split = r.Team.split(" (");
            r.SCHOOL = split[0];
            //const homeTeamRank = homeRank ? "#" + homeRank.RANK + " " : "";
            return r;
        } else {
            const split = r.SCHOOL.split(" (");
            r.SCHOOL = split[0];
            r.Team = split[0];
            //const homeTeamRank = homeRank ? "#" + homeRank.RANK + " " : "";
            return r;
        }
    });
}

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

/**
 *  @description fusing together 3 different data points.  1) Team Records (wins/losses) 2) Team Rank 3) Team Schedule and home/away team
 *  @returns {JSON} file
 */
async function createGameCalendar( division, week ) {

    const ilDivisionUrls = {
        1: 'di',
        2: 'dii',
        3: 'diii'
    };

    const ncaaDivisionUrls = {
        1: 'd1',
        2: 'd2',
        3: 'd3'
    };
    const
        teamsRecordUrl    = 'https://www.insidelacrosse.com/league/'+ ilDivisionUrls[division] +'/teams',
        // teamRankingsUrl   = 'https://www.ncaa.com/rankings/lacrosse-men/'+ ncaaDivisionUrls[division] +'/usila-coaches',
        teamRankingsUrl   = 'https://www.insidelacrosse.com/league/'+ ilDivisionUrls[division] +'/polls/2021',
        gameCalendarUrl   = 'https://www.insidelacrosse.com/league/'+ ilDivisionUrls[division] +'/calendar/19';

    //retrieves data
    const
        winsAndLosses     = await tableScraper.get(teamsRecordUrl),
        rankingData       = await tableScraper.get(teamRankingsUrl),
        htmlGamesSchedule = await boxScraper(gameCalendarUrl);

    console.log('rankingData ', rankingData);
    console.log('rankingData ', rankingData[0].length)

    //cleans & processes data
    const
        ranking           = normalizeSchoolName(await rankingData[0]),
        gameDates         = await createArrOfDate(htmlGamesSchedule),
        scheduleOfGames   = htmlGamesSchedule.map( (table,  i) => { return schedulerMapper(table, i, winsAndLosses[0], ranking, gameDates[i-1])});

    const data = [].concat.apply([], await scheduleOfGames);

    const year            = new Date().getFullYear();
    const divisionDisplay = ncaaDivisionUrls[division].toUpperCase();
    const file            = `data/game-calendar/${year}/${divisionDisplay}-${week}-calendar.json`;
    writeToJson( file, data);
}

function initializeGameCalendars() {
    for( let i = 1; i <=3; i++) {
        createGameCalendar(i, 'week6');
    }
}

initializeGameCalendars();
