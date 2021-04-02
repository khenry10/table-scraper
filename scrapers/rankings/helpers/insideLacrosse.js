
async function getInsideLacrosseRankings(url) {
    const insideLacrosseRank  = await tableScraper.get(insideLacrosseRankingsUrl);
}

module.exports = { getInsideLacrosseRankings };
