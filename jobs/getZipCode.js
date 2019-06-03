const mysql = require('mysql');
const mysqlConfig  = require('../config/mysqlConfig.js');
const googleApiKey = require('../config/googleApiKey.js');
const axios = require("axios");

const sqlQueryNTS = `SELECT violation_address, violation_city, violation_state FROM water_arlington.code_violation_nts WHERE violation_zip = '' LIMIT 0,75`
const sqlQueryUpdateZipCode = `UPDATE water_arlington.code_violation_nts SET Violation_Zip = ? WHERE Violation_Address = ?`;

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
	database => database.query( sqlQueryNTS )
		.then( rows => {
			
			let promises = [];

			for (let i = 0; i < rows.length; i++) {
				let street = rows[i].violation_address;
				let city = rows[i].violation_city;
				let state = rows[i].violation_state;
				// console.log(street, city, state)
				const getUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${street},+${city},+${state}&key=${googleApiKey}`
				promises.push(axios({
	    			method: 'get',
	    			url: getUrl
	    		}))
			}

			return axios.all(promises)
	    		.then(axios.spread((...responses) => {
	    			const results = responses.map(row => {
	    				// console.log('row: ', row);
	    				const config_url = row.config.url;
	    				const address_index = config_url.indexOf('address=')+8;
	    				const comma_index = config_url.indexOf(',');
	    				const street_length = comma_index - address_index;
	    				const new_street = config_url.substr(address_index, street_length);



	    				const address_components = row.data.results[0].address_components.length;
	    				let zip_code = '';
	    				for (let i = 0; i < address_components; i++) {
	    					if (row.data.results[0].address_components[i].types[0] == 'postal_code') {
	    						zip_code = row.data.results[0].address_components[i].long_name;
	    					}
	    				}

	    				console.log(new_street, zip_code)

	    				const record = [zip_code, new_street];
	    				return (database.query(sqlQueryUpdateZipCode, record));
	    			})
	    			return results;

	    		}))
	    } )

)
.then( (msg) => {
    // console.log('success!', msg)
} ).catch( err => {
    console.log('error 23: ', err)
} );


