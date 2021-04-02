
const insideLacrosseRankModel = require('./models/insideLacrosseRankModel');
const usilaRankModel = require('./models/usilaRankModel');

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

    console.log('rankModel 2', rankModel);

    // writeToJson(writeToFile, await insideLacrosseRank);
    return rankFormatted;
}

rankingSiteModels.forEach((rankingSiteModel) => {
    getAndFormatRankings(rankingSiteModel);
});
