// { Rank: '1', Team: 'Duke (5 - 0)', Points: '416 (10)', Prev: '1' }
module.exports = class rankingModel {
    constructor(team, rank, points, lastWeekRank) {
        this.team         = team;
        this.rank         = parseInt(rank);
        this.points       = points;
        this.lastWeekRank = parseInt(lastWeekRank) || "-";
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
    }

    toJson() {
        this.reformat();
        return {
            team            : this.team,
            rank            : this.rank,
            points          : this.points,
            lastWeekRank    : this.lastWeekRank,
            record          : this.record,
            firstPlaceVotes : this.firstPlaceVotes,
            source          : this.source
        }
    }

    setAllResultsArray(resultsArr) {
        this.allResultsArray = resultsArr;
    }

    setAllResultsObject(resultsObj) {
        this.allResultsObj = resultsObj;
    }
};
