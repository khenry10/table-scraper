const tableScraper = require('table-scraper');
const { boxScraper } = require('../../utils/box-scraper');
const xray         = require('x-ray')();
var request        = require('request');
var tabletojson    = require('tabletojson');
const cheerio      = require('cheerio');
const  { writeToJson } = require('../../utils/writeToJson');
const { getLaxNumbersDictionary } = require('./laxNumbers');

const debug = false;

const thisWeeksGames = [
    'Notre Dame',
    'North Carolina',
    // 'Robert Morris',
    // 'Air Force',
    'Army',
    // 'Navy',
    // 'Cornell',
    // 'Brown',
    // 'High Point',
    // 'Richmond',
    // 'Hobart',
    // 'LIU',
    // 'Lehigh',
    // 'Boston University',
    // 'Drexel',
    // 'Delaware',
    // 'Fairfield',
    // 'Towson',
    // 'Hofstra',
    'UMass',
    // 'Middlebury',
    // 'Amherst',
    // 'UIndy',
    // 'Mercyhurst',
    // 'Loyola',
    // 'Bucknell',
    // 'Princeton',
    // 'Stony Brook',
    // 'Johns Hopkins',
    // 'Vermont',
    // 'Penn State',
    // 'Yale',
    // 'Harvard',
    'Duke',
    'Syracuse',
    'St Lawrence',
    'RIT'
];

const getLaxNumbersTeamData = (team) => {
    let teamName;
    switch (team) {
        case 'UMass':
            teamName = 'Massachusetts';
            break;
        case 'Boston U':
            teamName = "Boston University";
            break;
        default:
            teamName = team;
    }

    return teamName
};

const shapeLaxNumberStats = (teamName, teamData) => {
    const teamStat = {};
    teamStat[`${teamName}_Lax_Numbers_Rank`] = teamData.ranking;
    teamStat[`${teamName}_Lax_Numbers_Rating`] = teamData.rating;

    // const max = Math.max(homeTeamLaxNumbers.rating, awayTeamLaxNumbers.rating);
    // const min = Math.min(homeTeamLaxNumbers.rating, awayTeamLaxNumbers.rating);
    //
    // game['lax_numbers_rating_diff'] = max - min;

    return teamStat;
}

let count = 0

/**
 *
 * @param game {obj} - upcoming game to be played
 * {
 *   '4': 'PreviewFan Picks',
 *   Home: 'NJIT',
 *   Away: 'UAlbany',
 *   Time: '6:00 pm',
 *   Watch: 'Webstream'
 * }
 *
 * @param winsAndLosses
 * @param rankings
 * @param gameDate
 * @param laxNumbersDictionary {obj} - { Maryland: { wins: 11, rating: 1, sched: 92.53, ... }}
 * @returns {*}
 */
function createAndFormatGame(game, winsAndLosses, rankings, gameDate, laxNumbersDictionary) {
    const debug = true;
    // const debug = game.Home === 'North Carolina';
    // const debug = count === 1;
    if (debug) {
        console.log('game input', game);
        // console.log('winsAndLosses', winsAndLosses);
        // console.log('rankings', rankings);
        console.log('gameDate', gameDate);
    }
    count++
    const Home = winsAndLosses.find( r => r.Team === game.Home );
    let Away = winsAndLosses.find( r => r.Team === game.Away );

    if (debug) {
        console.log('Home =', Home);
        console.log('Away =', Away);
    }

    let homeRank, awayRank;

    if ( !Away ) {
        Away = {}
    }

    // if(!thisWeeksGames.includes(Away.Team) || !thisWeeksGames.includes(Home.Team)) return

    rankings.forEach( (r, i) => {
        if ( Home && Home.Team && r.SCHOOL == Home.Team ){
            homeRank = r;
        } else if ( r.SCHOOL == Away.Team ){
            awayRank = r;
        }
    });

    if (debug) {
        console.log('homeRank =', homeRank);
        console.log('awayRank =', awayRank);
    }

    const homeTeamRank = homeRank ? "#" + homeRank.Rank + " " : "";
    const awayTeamRank = awayRank ? "#" + awayRank.Rank + " " : "";

    const h = !Home ? {L: '-', H: '-'} : Home;
    const a = !Away ? {L: '-', H: '-'} : Away;

    game.date =  gameDate;
    game.Home =  homeTeamRank + game.Home + " ("+ h['W']  +"-"+ h['L']  +")";
    game.Away =  awayTeamRank + game.Away + " ("+ a['W']  +"-"+ a['L']  +")";
    game.timestamp = new Date();
    if (debug) {
        console.log('game =', game)
    }

    const homeTeamLaxNumbers = laxNumbersDictionary[getLaxNumbersTeamData(Home.Team)];
    const awayTeamLaxNumbers = laxNumbersDictionary[getLaxNumbersTeamData(Away.Team)];
    let shapedHomeLaxStats;
    let shapedAwayLaxStats;

    if (homeTeamLaxNumbers) {
        shapedHomeLaxStats = shapeLaxNumberStats(Home.Team, homeTeamLaxNumbers);
    }

    if (awayTeamLaxNumbers) {
        shapedAwayLaxStats =shapeLaxNumberStats(Away.Team, awayTeamLaxNumbers);
    }

    if (homeTeamLaxNumbers && awayTeamLaxNumbers) {

        const max = Math.max(homeTeamLaxNumbers.rating, awayTeamLaxNumbers.rating);
        const min = Math.min(homeTeamLaxNumbers.rating, awayTeamLaxNumbers.rating);

        game['lax_numbers_rating_diff'] = max - min;
    }

    return Object.assign(game, shapedHomeLaxStats, shapedAwayLaxStats)
}

function combineAndProcess(scheduleOfGames, winsAndLosses, ranking, gameDate, laxNumbersDictionary) {
    return scheduleOfGames.map( (game) => {
        return createAndFormatGame(game, winsAndLosses, ranking, gameDate, laxNumbersDictionary);
    });
}

function schedulerMapper(table, index, winsAndLosses, ranking, gameDate,laxNumbersDictionary) {
    const scheduleOfGames = tabletojson.convert('<table>' + table + '</table>')[0];

    //conversion creates duplicate of the first table of dates
    if ( index === 0 ) {
        return '';
    }

    // return scheduleOfGames.map( (game) => {
    //     return createAndFormatGame(game, winsAndLosses, ranking, gameDate);
    // });

    if (debug) console.log('scheduleOfGames =', scheduleOfGames);

    return combineAndProcess(scheduleOfGames, winsAndLosses, ranking, gameDate, laxNumbersDictionary);
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

            console.log('str =', str)

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
            console.log('dateArr =', dateArr)
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

    // const laxNumbersHtml = await getHtml('https://www.laxnumbers.com/ratings.php?y=2022&v=401');
    const laxNumbersDictionary = getLaxNumbersDictionary();

    //retrieves data
    const
        [winsAndLosses]   = await tableScraper.get(buildUrl(division, 'teams')),
        rankingData       = await tableScraper.get(buildUrl(division, 'polls')),
        htmlGamesSchedule = await boxScraper(buildUrl(division, 'calendar'));
        // laxNumbersRankings = await tableScraper.get('https://www.laxnumbers.com/ratings.php?y=2022&v=401'); // only gets the header table
        // laxNumbersRankings = await boxScraper('https://www.laxnumbers.com/ratings.php?y=2022&v=401',null,['table@html']);
        // console.log('laxNumbersRankings =', laxNumbersRankings)
        // console.log('laxNumbersRankings =', laxNumbersRankings[1])

    // console.log('rankingData ', rankingData);
    // console.log('rankingData ', rankingData[0].length);

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
            //  console.log('winsAndLosses = ',winsAndLosses);
             // console.log('ranking = ',ranking);
            // return scheduleOfGames.map( (game) => {
            //     return createAndFormatGame(game, winsAndLosses, ranking, gameDates[i-1]);
            // });
            return schedulerMapper(table, i, winsAndLosses, ranking, gameDates[i-1], laxNumbersDictionary)
        });

    const data = [].concat.apply([], await scheduleOfGames);

    const year            = new Date().getFullYear();
    const divisionDisplay = ncaaDivisionUrls[division].toUpperCase();
    const file            = `data/game-calendar/${year}/${divisionDisplay}-${week}-calendar.json`;
    // console.log('file =', file)
    // writeToJson(file, data);

    console.log('data = ', data)

    // const fs           = require('fs');
    // fs.writeFile(file, JSON.stringify( data, null, 2 ), function (err) {
    //     if (err) throw err;
    //     console.log( filename,'Saved!')
    // });
}

function initializeGameCalendars() {
    const [, , division, week] = process.argv;
    console.log(' process.argv =',  process.argv);
    console.log('division =', division);
    console.log('week =', week);
    createGameCalendar(division, `week${week}`);
    // for( let i = 3; i <= 3; i++) {
    //     console.log(`starting division ${i}`);
    //     createGameCalendar(i, 'week05');
    // }
}

initializeGameCalendars();