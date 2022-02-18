const tableScraper = require('table-scraper');
const rankingModel = require('./rankingModel');

// { Rank: '1', Team: 'Duke (5 - 0)', Points: '416 (10)', Prev: '1' }

const url = 'https://www.insidelacrosse.com/league/';
const divisionMap = {
    1: 'DI',
    2: 'D2',
    3: 'D3',
};

module.exports = class insideLacrosseModel extends rankingModel {
    constructor(division, team, rank, points, lastWeekRank) {
        super();
        this.division     = division;
        this.team         = team;
        this.rank         = parseInt(rank);
        this.points       = points;
        this.lastWeekRank = parseInt(lastWeekRank) || "-";
        this.url          = `${url}${divisionMap[this.division]}/polls`;
        this.writeToFile  = 'insideLacrosseRank-week1.json';
        this.source       = 'IL';
    }

    removeParens( value ) {
        return value ? value.split(')')[0] : 0;
    }

    reformatPoints() {
        const [points, firstPlaceVotes] = this.points.split('('); // [416, '10)']
        this.points = parseInt(points);
        this.firstPlaceVotes = parseInt(this.removeParens(firstPlaceVotes));
    }

    reformatTeamName() {
        const [team, record] = this.team.split(" (");
        this.team   = team;
        this.record = this.removeParens(record);
    }

    reformat() {
        this.reformatPoints();
        this.reformatTeamName();
    }

    // toJson() {
    //     this.reformat();
    //     return {
    //         team            : this.team,
    //         rank            : this.rank,
    //         points          : this.points,
    //         lastWeekRank    : this.lastWeekRank,
    //         record          : this.record,
    //         firstPlaceVotes : this.firstPlaceVotes
    //     }
    // }

    async get() {
        const results = await tableScraper.get(this.url);
        return results[0];
    }

    create(obj) {
        const { Team, Rank, Points, Prev} = obj;
        this.team = Team;
        this.rank = Rank;
        this.points = Points;
        this.lastWeekRank = Prev;
        return this;
    }

    // setAllResultsArray(resultsArr) {
    //     this.allResultsArray = resultsArr;
    // }
    //
    // setAllResultsObject(resultsObj) {
    //     this.allResultsObj = resultsObj;
    // }
};
