
const insideLacrosseRankModel = require('./models/insideLacrosseRankModel');
const usilaRankModel = require('./models/usilaRankModel');

const { writeToJson } = require('../../utils/writeToJson');

const rankingSiteModels = [
    insideLacrosseRankModel,
    usilaRankModel
];

async function getAndFormatRankings(rankingSiteModel) {

    const rankModel   =  new rankingSiteModel(1);
    const rankResults = await rankModel.get();

    //console.log('rankModel', rankModel);

    allRankResultsObject = {};
    const rankFormatted = await rankResults.map((teamRankData) => {
        const rankObject = rankModel.create(teamRankData).toJson();
        allRankResultsObject[rankObject.team] = rankObject;
        return rankObject;
    });

    await rankModel.setAllResultsArray(rankFormatted);
    await rankModel.setAllResultsObject(allRankResultsObject);

    console.log('rankModel allResultsArray', rankModel.allResultsArray);
    console.log('rankModel allResultsObj', rankModel.allResultsObj);

    writeToJson(rankModel.writeToFile, rankModel.allResultsObj);
    return rankFormatted;
}

rankingSiteModels.forEach((rankingSiteModel) => {
    getAndFormatRankings(rankingSiteModel);
});
