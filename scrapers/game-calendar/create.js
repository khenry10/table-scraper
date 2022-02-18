const tableScraper = require('table-scraper');
const { boxScraper } = require('../../utils/box-scraper');
const xray         = require('x-ray')();
var request        = require('request');
var tabletojson    = require('tabletojson');
const cheerio      = require('cheerio');
const  { writeToJson } = require('../../utils/writeToJson');

function createAndFormatGame(game, winsAndLosses, rankings, gameDate) {
    console.log('game', game);
    // console.log('winsAndLosses', winsAndLosses);
    //console.log('rankings', rankings);
    console.log('gameDate', gameDate);
    const Home = winsAndLosses.find( r => r.Team === game.Home );
    let Away = winsAndLosses.find( r => r.Team === game.Away );
    console.log('Home', Home);

    let homeRank, awayRank;

    if ( !Away ) {
        Away = {}
    }

    rankings.forEach( r => {
        //console.log('r = ', r)
        if ( Home && Home.team && r.SCHOOL == Home.Team ){
            homeRank = r;
        } else if ( r.SCHOOL == Away.Team ){
            awayRank = r;
        }
    });

    const homeTeamRank = homeRank ? "#" + homeRank.Rank + " " : "";
    const awayTeamRank = awayRank ? "#" + awayRank.Rank + " " : "";

    const h = !Home ? {L: '-', H: '-'} : Home;
    const a = !Away ? {L: '-', H: '-'} : Away;

    game.date =  gameDate;
    game.Home =  homeTeamRank + game.Home + " ("+ h['W']  +"-"+ h['L']  +")";
    game.Away =  awayTeamRank + game.Away + " ("+ a['W']  +"-"+ a['L']  +")";
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

    // return scheduleOfGames.map( (game) => {
    //     return createAndFormatGame(game, winsAndLosses, ranking, gameDate);
    // });

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
    //console.log('teamRankings', teamRankings);
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

const buildUrl = (division, page) => {
    const ilDivisionUrls = {
        1: 'di',
        2: 'dii',
        3: 'diii'
    };

    return `https://www.insidelacrosse.com/league/${ilDivisionUrls[division]}/${page}`;
};

/**
 *  @description fusing together 3 different data points.  1) Team Records (wins/losses) 2) Team Rank 3) Team Schedule and home/away team
 *  @returns {JSON} file
 */
async function createGameCalendar( division, week ) {

    const ncaaDivisionUrls = {
        1: 'd1',
        2: 'd2',
        3: 'd3'
    };

    //retrieves data
    const
        [winsAndLosses]   = await tableScraper.get(buildUrl(division, 'teams')),
        rankingData       = await tableScraper.get(buildUrl(division, 'polls')),
        htmlGamesSchedule = await boxScraper(buildUrl(division, 'calendar'));

    // console.log('rankingData ', rankingData);
    console.log('rankingData ', rankingData[0].length);

    //cleans & processes data
    const
        ranking           = normalizeSchoolName(await rankingData[0]),
        gameDates         = await createArrOfDate(htmlGamesSchedule),
        scheduleOfGames   = htmlGamesSchedule.map( (table,  i) => {
            // const scheduleOfGames = tabletojson.convert('<table>' + table + '</table>')[0];
            //
            // //conversion creates duplicate of the first table of dates
            // if ( i === 0 ) return '';
            //
             console.log('winsAndLosses = ',winsAndLosses);
             console.log('ranking = ',ranking);
            // return scheduleOfGames.map( (game) => {
            //     return createAndFormatGame(game, winsAndLosses, ranking, gameDates[i-1]);
            // });
            return schedulerMapper(table, i, winsAndLosses, ranking, gameDates[i-1])
        });

    const data = [].concat.apply([], await scheduleOfGames);

    const year            = new Date().getFullYear();
    const divisionDisplay = ncaaDivisionUrls[division].toUpperCase();
    const file            = `data/game-calendar/${year}/${divisionDisplay}-${week}-calendar.json`;
    writeToJson(file, data);
}

function initializeGameCalendars() {
    for( let i = 1; i <= 3; i++) {
        console.log(`starting division ${i}`);
        createGameCalendar(i, 'week01');
    }
}

initializeGameCalendars();
