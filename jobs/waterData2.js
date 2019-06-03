const axios = require("axios");
const schedule = require("node-schedule");
const url = "https://gis2.arlingtontx.gov/agsext2/rest/services/OpenData/OD_Table/MapServer/1/query?where=1%3D1&outFields=*&outSR=4326&f=json";
const refreshRate = 30;
const mysqlConfig  = require('../config/mysqlConfig.js');
const mysql = require('mysql');
let arlingtonData = {};
let arrStreetAddresses = [];

console.log('waterData2 running...');

function getDate() {
    let date = new Date();
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;
    let day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;
    return year + "-" + month + "-" + day;
};

function formatDate(date) {
	const year = date.slice(-4);
	const month = date.slice(0, 2);
	const day = date.slice(3, 5);	
	const formatted_date = year + '-' + month + '-' + day;
	return formatted_date;
}

class Database {
    constructor( config ) {
        this.connection = mysql.createConnection( config );
    }
    query( sql, args ) {
        return new Promise( ( resolve, reject ) => {
            this.connection.query( sql, args, ( err, rows ) => {
                if ( err )
                    return reject( err );
                resolve( rows );
            } );
        } );
    }
    close() {
        return new Promise( ( resolve, reject ) => {
            this.connection.end( err => {
                if ( err )
                    return reject( err );
                resolve();
            } );
        } );
    }
}

Database.execute = async function( config, callback ) {

	const response = await axios.get(url);
	arlingtonData = response.data.features;
	arrStreetAddresses = arlingtonData.map(results => results.attributes.PREMISEADDRESS);
	// console.log(arrStreetAddresses);

    const database = new Database( config );
    return callback( database ).then(
        result => database.close().then( () => result ),
        err => database.close().then( () => { throw err; } )
    );
};


Database.execute( mysqlConfig, 
	database => database.query( 'SELECT * FROM water_arlington.addresses')
		.then( rows => {
	        let arrSqlStreetAddresses = rows.map(res => res.street); // separate street addresses from SQL results
	        let newShutOffs = arrStreetAddresses.filter((item) => !arrSqlStreetAddresses.includes(item)) // filter new arlington data against SQL results
	        let newShutOffsWithData = arlingtonData.filter((item) => newShutOffs.includes(item.attributes.PREMISEADDRESS)) // add back in additional info
	        return newShutOffsWithData;
	    } )
	    .then( differences => {
	        // console.log(differences);
	        const todaysDate = getDate();
	        const formattedSqlData = differences.map((item) => [item.attributes.PREMISEADDRESS, item.attributes.PREMISEZIP, formatDate(item.attributes.WATEROFFDATE), todaysDate]);
	        console.log(formattedSqlData);
	        if (formattedSqlData.length == 0) {
	        	return 'no new records';
	        }
	        return database.query( 'INSERT INTO water_arlington.addresses (street, zip, water_shut_off, import_date) VALUES ?', [formattedSqlData] )
	    } )
)
.then( (msg) => {
    console.log(msg)
} ).catch( err => {
    console.log('error: ', err)
} );
















