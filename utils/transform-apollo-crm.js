// const data = require('../data/apollo/manual')
// const people = require('../data/apollo/manual/11172021-1')
const people = require('../data/apollo/manual/120621');
const { writeToJson } = require('../utils/writeToJson');

const objectsToCsv = require('objects-to-csv');

function transform() {
    console.log('people =', people)
    const data = []
    people.forEach((person) => {
        const metadata = {};
        const first_name = 'first_name';
        const last_name = 'last_name';
        const email = 'email';
        const title = 'title';

        metadata[first_name] = person[first_name]
        metadata[last_name] = person[last_name]
        metadata[email] = person[email]
        metadata[title] = person[title]

        metadata['organization'] = person.organization && person.organization.name ? person.organization.name : '';

        data.push(metadata)
    })
    console.log('data =', data)
    console.log('write to csv')
    // writeToJson(`data/apollo/output/${new Date()}.csv`, data)

    const csv = new objectsToCsv(data);
    const date = new Date().getMonth()+1 +'-' + new Date().getDate() +'-'+ new Date().getFullYear();
    csv.toDisk(`data/apollo/output/apollo-${date}.csv`,{ append: true });
}
transform()
