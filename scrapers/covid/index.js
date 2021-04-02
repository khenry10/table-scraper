const date = new Date();

const dateFormat = `${date.getMonth()+1}-${date.getDate()}-${date.getFullYear()}`;

const states = ['AL', 'AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','PR','RI','SC','SD','TN','TX','UT','VT','VA','VI','WA','WV','WI','WY']

// api/v1/states/{state}/{date}.{format}
// https://covidtracking.com/api/v1/states/CA/20200408.json
const statesByDateUrl = `https://covidtracking.com/api/v1/states/$uspsCode$/$date$.json`;

async function getCoronavirusData(state, url) {
    const resp = await fetcher(url);
    //console.dir(`resp = ${resp}`);

    const data = JSON.parse(resp);
    //const data = require('./data/coronavirus/5-26-2020-rawData');
    //console.dir(`data = ${data}`);

    const labels        = [];
    const lineGraphData = [];
    const deaths        = [];
    const graphLabels   = [];
    const graphDeaths   = [];


    const tableData  = [];
    let columns      = [];
    const dateFormat =  `${date.getMonth()+1}-${date.getDate()}-${date.getFullYear()}`;

    const createRow = (row, yesterdaysTotalPositive, yesterdaysDeaths) => {
        console.log(`row: yesterdaysTotalPositive ${yesterdaysTotalPositive} ; yesterdaysDeaths ${yesterdaysDeaths} `);
        console.dir(row);
        const date       = new Date(row['dateChecked']);
        const dateFormat =  `${date.getMonth()+1}-${date.getDate()}-${date.getFullYear()}`;
        const deaths     = row['death'] || 0;

        graphLabels.unshift(dateFormat);
        graphDeaths.unshift(deaths);

        return {
            date                     : dateFormat,
            state                     : state,
            'Cases 24hr'          : row['positiveIncrease'],
            'Cases % 24hr'        : roundToThreePlaces(row['positiveIncrease'] / yesterdaysTotalPositive),
            'Deaths 24hr'          : row['deathIncrease'],
            'Deaths % 24hr ' : roundToThreePlaces(row['deathIncrease'] / yesterdaysDeaths),
            'Tests 24hr'           : row['totalTestResultsIncrease'],
            'Positive Tests 24hr': roundToThreePlaces(row['positiveIncrease'] / row['totalTestResultsIncrease']),
            'Total Recovered'         : row['recovered'],
            'Total Active Infections' : row['positive'] - row['death'] - row['recovered'],
            'Total Cases'   : row['positive'],
            'Total Deaths'            : deaths,
            // dataObj['Total Deaths Per Capita'] = (day.death / population) *100 + '%';
            // dataObj['Total Tests'] = day.totalTestResults;
            // dataObj['Total Tests Per Capita'] = (day.totalTestResults / population) *100 + '%';
            //dataObj['Total Confirmed Cases Per Capita'] = (day.positive / population) *100 + '%';
            //dataObj['Mortality Rate'] = (day.death / day.positive) *100 + "%";
            //dataObj['Active Infections % of Total'] = ((day.positive - day.death - day.recovered) / day.positive)*100 + "%";
        }
    };

    const createColumn = function(title) {
        columns.push({title, field: title});
    };

    for(let index =  0; index <= data.length-1; index++) {
        const day                     = data[index];
        const lastEntry               = data.length -1 === index;
        const population              = 6045680;
        const yesterday               = index +1;
        const yesterdaysTotalPositive = (lastEntry ? 0 : data[yesterday].positive);
        const yesterdaysDeaths        = (lastEntry ? 0 :data[yesterday].death);

        const row = createRow(day, yesterdaysTotalPositive, yesterdaysDeaths );

        if (index === 0){
            const keys = Object.keys(row);
            keys.forEach(key => createColumn(key))
        }

        tableData.push(row)

    }

    const exportData = {rawData: data, labels, lineGraphData, deaths, tableData};

    const csv = new ObjectsToCsv(tableData);
    await csv.toDisk(`./data/coronavirus/${dateFormat}-tableData.csv`,{ append: true });

    const graphing = { labels: graphLabels, deaths: graphDeaths};

    // state
    //writeToJson(`data/coronavirus/${dateFormat}-${state}.json`,exportData);
    //writeToJson(`data/coronavirus/states-historical/raw-data/${state}-${dateFormat}-rawData.json`,data);
    //writeToJson(`data/coronavirus/${dateFormat}-columns.json`,columns);
    // writeToJson(`data/coronavirus/states-historical/rows/${state}-${dateFormat}-rows.json`,tableData);

    // ALL states
    //appendToJsonFile('data/coronavirus/states-historical/all-states.json', tableData)

    // us
    writeToJson(`data/coronavirus/us/historical/raw-data/${dateFormat}-rawData.json`,data);
    writeToJson(`data/coronavirus/us/${dateFormat}-columns.json`,columns);
    writeToJson(`data/coronavirus/us/historical/rows/${dateFormat}-rows.json`,tableData);
    writeToJson(`data/coronavirus/us/historical/graphs/${dateFormat}-graphs.json`,graphing);

    return tableData;

};

//getCoronavirusData();

// states.forEach( (state) => {
//     //'https://covidtracking.com/api/v1/states/md/daily.json'
//     const baseUrl = 'https://covidtracking.com/api/v1/states/$uspsCode$/daily.json';
//     const url = baseUrl.replace('$uspsCode$', state);
//     getCoronavirusData(state, url)
// });

const getUSdata = () => {
    const url = 'https://covidtracking.com/api/v1/us/daily.json';
    getCoronavirusData('usa', url);
};
//getUSdata();
