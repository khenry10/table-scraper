const tableScraper = require('table-scraper');

var request = require('request');
const xray = require('x-ray')();
var tabletojson = require('tabletojson');
const cheerio = require('cheerio')
//const winLoss = require('./winLoss')
const winLossData = require('./winsLossData.json');
const fs = require('fs');

/**
 * @description method used to take body html and create an array of dates for the weekend games
 * @param {HTML} body 
 * @returns array of dates for that weekend's games
 **/
const createArrOfDate =  (body) => {
    return new Promise(function(resolve, reject) {
      return xray(body, ['.box@html'])(function (conversionError, tableHtmlList) {
        //console.log("tableHtmlList = ", tableHtmlList)
       const $ = cheerio.load(body);
          //console.log("$ = ", $)
          //console.log("body = ", body)
          const str = $("h4").text()
          console.log(" str = ", str)
          //console.log('str.text(); = ', str)
    
          let str2 = ""
    
          for ( let i = 0; i < str.length; i++ ) { 
            if ( !parseInt( str[i] ) ) 
            {
              str2 += str[i]
            } else { 
              
              console.log(str[i], " parseInt( str[i +1] = ", parseInt( str[i + 1] ) );
              
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
          console.log("str2 = ", str2)
          console.log("str2.split(;) = ", str2.split(";") )
           const dateArr = str2.split(";");
           return  resolve( dateArr );
        })
    })
} 

const gamesDates = ['Friday, March 29',
'Saturday, March 30',
'Sunday, March 31',
'Tuesday, April 2',
'Saturday, April 6',
'Sunday, April 7',
'Tuesday, April 9',
'' ];

module.exports.get = function get(url, winsAndLosses, rankings) {
    console.log("xraying url = ", url)
    return new Promise(function(resolve, reject) {
      request.get(url, function(err, response, body) {
          
        if (err) {
          return reject(err);
        }
        if (response.statusCode >= 400) {
          return reject(new Error('The website requested returned an error!'));
        }

        // please copy/paste the dates from the terminal into gamesDates var above
        const dates = createArrOfDate(body);
        console.log("dates = ", dates)

        createArrOfDate(body).then( (dates) => {

          xray(body, ['.box@html'])(function (conversionError, tableHtmlList) {
            if (conversionError) {
                console.log("conversionError = ", conversionError)
              return reject(conversionError);
            }
        
  
            resolve(tableHtmlList.map(function(table,  i) {
              const tableDate = tabletojson.convert('<table>' + table + '</table>')[0];
              
              return tableDate.map( (tableDate) => {
                  const Home = winsAndLosses.find( r => r.Team === tableDate.Home )
                  const Away = winsAndLosses.find( r => r.Team === tableDate.Away );

                  //console.log("home = ", Home)
                  //console.log( "rankings = ", rankings );

                  let homeRank, awayRank;

                  rankings.forEach( r => {
                    if ( r.SCHOOL == Home.Team ){ 
                      homeRank = r;
                    } else if ( r.SCHOOL == Away.Team ){
                      awayRank = r;
                    }
                  });

                  console.log("homeRank = ", homeRank)

                  const homeTeamRank = homeRank ? "#" + homeRank.RANK + " " : "";
                  const awayTeamRank = awayRank ? "#" + awayRank.RANK + " " : "";
                  
                  tableDate.date =  new Date( dates[i].split(',')[1] + ',' + new Date().getFullYear() + ' ' + tableDate.Time );
                  tableDate.Home =  homeTeamRank + tableDate.Home + " ("+ Home['W']  +"-"+ Home['L']  +")";
                  tableDate.Away =  awayTeamRank + tableDate.Away + " ("+ Away['W']  +"-"+ Away['L']  +")"; 
  
                  return tableDate
              });
           }));
  
          });


        })



        
         // not sure why, but this isn't actually outputting data into the file, 
        // createArrOfDate.then( r => {
        //   console.log('r = ', r)
        //   fs.writeFile('gameDates.json', JSON.stringify( r, null, 2 )  )
        // }); 




      })
    });
  };

/**
 * @description pulls current Wins/Loss data for all D1 teams
 * delete contents in winsLossData.json and leave an empty object: {}
 * Run this first 
 * then comment me out
 */
tableScraper
    .get('https://www.insidelacrosse.com/league/di/teams/19')
    .then( (tableData ) => {
        //console.log("tableData = ", tableData);
        const winsAndLosses = tableData[0];
        //console.log(winsAndLosses)
        //fs.writeFile('winsLossData.json', JSON.stringify( tableData[0] , null, 2) )

        //tableScraper.get('https://www.insidelacrosse.com/league/di/polls/19')
        tableScraper.get('https://www.ncaa.com/rankings/lacrosse-men/d1/inside-lacrosse')
        .then( (tableData ) => {
          const ranking = tableData[0].map( r => {
            // somes schools are coming trhough as 'Penn State (13)' and others just as 'Loyola'
            //console.log("r = ", r);
            const split = r.TEAM.split(" (");
            r.SCHOOL = split[0];
            //console.log("split = ", split)
            return r;
          });
          console.log("lax.com = ", tableData);

          
                /**
                *  run me next, 
                *  copy/paste the dates from the terminal into gamesDates variable
                *  delete data in 
                *  run me again 
                *   copy data in lax-calendar.json and pasted it into $socialMediaPosts in Omelas
              **/
            module.exports.get('https://www.insidelacrosse.com/league/di/calendar/19', winsAndLosses, ranking)
            .then( ( html ) => {
                const data = [].concat.apply([], html);
                //console.log("data = ", data)
                fs.appendFile('lax-calendar.json', JSON.stringify( data, null, 2 ), function (err) {
                  if (err) throw err;
                  console.log( 'lax-calendar.json Saved!')
            })
            })


        })

      })




// const cheerio = require('cheerio');
// let jsonframe = require('jsonframe-cheerio');
// const axios = require('axios')

// // let $$ = cheerio.load('https://www.businessinsider.com/57-tech-startups-vc-insiders-say-will-boom-in-2019-2019-1');
// // const text = $('.body').text()
// // console.log("text = ", text)

// axios.get('https://www.businessinsider.com/tim-cook-email-to-apple-retail-employees-about-angela-ahrendts-leaving-2019-2')
//     .then(response => {
//         console.log(response);
//         //console.log(response.data.url);
//         //console.log(response.data.explanation);
//     })
//     .catch(error => {
//         console.log(error);
//     });
