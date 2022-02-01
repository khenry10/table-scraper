const tableScraper = require('table-scraper');
const { writeToJson } = require('../utils/writeToJson');

const url = 'https://app.apollo.io/#/people?finderViewId=5a205be19a57e40c095e1d5f&page=1&personTitles[]=conference%20manager'

const getContacts = async () => {
    const contacts = await tableScraper.get(url)
    console.log('contacts = ', contacts)
    console.log('writing to csv')
    writeToJson(`data/apollo/output/${new Date()}.csv`, contacts)
}

getContacts()
