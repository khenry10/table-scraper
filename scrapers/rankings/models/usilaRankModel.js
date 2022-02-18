const { getHtml }  = require('../../../utils/fetcher');
const { xrayer }   = require('../../../utils/xrayer');
const rankingModel = require('./rankingModel');
const url          = 'https://usila.org/sports/2021/2/15/mlax2021WK2polld1.aspx';

module.exports = class usilaRankModel extends rankingModel {
  constructor() {
      super();
      this.url    = 'https://usila.org/sports/2021/2/15/mlax2021WK2polld1.aspx';
      this.writeToFile  = `usilaRank-week1.json`;
      this.source = 'USILA';
  }

  async get() {
      const html = await getHtml(this.url);
      const rankTable = xrayer(html, '.sidearm-table-container@html');
      return rankTable
  }

    create(payload) {
        const { Team, Rank, Record } = payload;
        this.team = Team;
        this.rank = Rank;
        this.record = Record;
        this.points = payload["Points (First Place Votes)"];
        this.lastWeekRank = payload["Last Week"];
        return this;
    }

    setAllResultsArray(resultsArr) {
        this.allResultsArray = resultsArr;
    }

    setAllResultsObject(resultsObj) {
        this.allResultsObj = resultsObj;
    }
};
