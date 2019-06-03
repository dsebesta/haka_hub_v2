
const mysql = require('mysql');
const mysqlConfig  = require('../config/mysqlConfig.js');
const appendApi  = require('../config/appendApi.js');
const axios = require("axios");

const sqlQueryMissingPhoneNumbers = `SELECT * FROM water_arlington.addresses WHERE skip_traced is null AND owner_name NOT REGEXP 'lp|llc|acquisition|trust|holding|manage|education|living|invest|participation|venture|realty|asset|city|property|properties|international|ltd|current'`
const sqlQueryUpdatePhoneNumbers = `UPDATE water_arlington.addresses SET owner_phone_1 = ?, df_first_name = ?, df_middle_name = ?, df_last_name = ?, df_address = ?, df_city = ?, df_state = ?, df_zip = ?, skip_traced = 1 WHERE street = ?`
const sqlQueryNoPhoneNumber = `UPDATE water_arlington.addresses SET skip_traced = 1 WHERE street = ?`

console.log('=================grabbing phone number info=================');


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
    const database = new Database( config );
    return callback( database ).then(
        result => database.close().then( () => result ),
        err => database.close().then( () => { throw err; } )
    );
};

Database.execute( mysqlConfig, 
	database => database.query( sqlQueryMissingPhoneNumbers )
		.then( rows => {
			console.log('query found: ', rows)
			const reformat = rows.map(row => {
				let last_name = row.owner_name.substr(0, row.owner_name.indexOf(','));
				let first_name = row.owner_name.substr(row.owner_name.indexOf(',')+2, row.owner_name.length);
				return [first_name, last_name, row.street, 'ARLINGTON', 'TX', row.zip];
			})
			return reformat;
	    } )
	    .then( rows => {
	    	
	    	let promises = [];

	    	for (let i = 0; i < rows.length; i++) {
	    		let first_name = rows[i][0], 
	    			last_name = rows[i][1], 
	    			street_address = rows[i][2], 
	    			city = rows[i][3], 
	    			state = rows[i][4], 
	    			zip = rows[i][5];
	    		const getUrl = `https://api.datafinder.com/qdf.php?service=phone&k2=${appendApi}&d_first=${first_name}&d_last=${last_name}&d_fulladdr=${street_address}&d_city=${city}&d_state=${state}&d_zip=${zip}`;
	    		promises.push(axios({
	    			method: 'get',
	    			url: getUrl
	    		}))
	    	}

	    	

	    	return axios.all(promises)
	    		.then(axios.spread((...responses) => {

	    			const results = responses.map(row => {

	    				// console.log('row: ', row)

	    				const config_url = row.config.url;
	    				const address_index = config_url.indexOf('fulladdr=')+9;
						const city_index = config_url.indexOf('d_city=');
						const address_length = city_index - address_index - 1;
	    				const address = config_url.substr(address_index, address_length);

	    				if (row.data.datafinder['num-results'] == 0) {
	    					console.log('no data found');
	    					return (database.query(sqlQueryNoPhoneNumber, address))
	    				}

	    				const phone = row.data.datafinder.results[0].Phone;
	    				const df_first_name = row.data.datafinder.results[0].FirstName;
	    				const df_middle_name = row.data.datafinder.results[0].MiddleName;
	    				const df_last_name = row.data.datafinder.results[0].LastName;
	    				const df_address = row.data.datafinder.results[0].Address;
	    				const df_city = row.data.datafinder.results[0].City;
	    				const df_state = row.data.datafinder.results[0].State;
	    				const df_zip = row.data.datafinder.results[0].Zip;
	    				
	    				let record = [phone, df_first_name, df_middle_name, df_last_name, df_address, df_city, df_state, df_zip, address];
	    				console.log('record: ', record)
	    				// console.log('address: ', address);
	    				return (database.query(sqlQueryUpdatePhoneNumbers, record))
	    			})

	    			return results;

	    		}))
	    } )
)
.then( (msg) => {
    console.log('success!: ', msg)
} ).catch( err => {
    console.log('error 23: ', err)
} );
