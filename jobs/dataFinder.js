
const mysql = require('mysql');
const mysqlConfig  = require('../config/mysqlConfig.js');
const appendApi  = require('../config/appendApi.js');
const axios = require("axios");

const sqlQueryMissingPhoneNumbers = `SELECT * FROM water_arlington.addresses WHERE owner_phone_1 is null AND owner_name NOT REGEXP 'lp|llc|acquisition|trust|holding|manage|education|living|invest|participation|venture|realty|asset|city|property|properties|international|ltd|current' LIMIT 0, 1`
const sqlQueryUpdatePhoneNumbers = `UPDATE water_arlington.addresses SET owner_phone_1 = ?, df_first_name = ?, df_middle_name = ?, df_last_name = ?, df_address = ?, df_city = ?, df_state = ?, df_zip = ? WHERE street = ?`

console.log('grabbing phone number info....');


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

					// const updateDatabase = async () => {
			  //   		return await rows.map(row => {
			  //   			const owner_city = row.OwnerCityState.substr(0, row.OwnerCityState.length - 4);
			  //   			const owner_state = row.OwnerCityState.substr(-2);
			  //   			console.log( row.PropertyAddress + ' updated successfully.' );
			  //   			const record = [row.Owner, owner_address, owner_city, owner_state, row.PropertyAddress];
			  //   			database.query( sqlQueryUpdateAddresses, record)
			  //   		})
			  //   	}

			  //   	return updateDatabase();

	    			// return responses.forEach(res => {

	    			// 	console.log("response1: ", res.data.datafinder)
	    			// 	// console.log("results length", res.data.datafinder.results.length)
	    			// 	// console.log("results: ", res.data.datafinder.results)

	    			// 	let record = [];

	    			// })

	    			// console.log(responses)

	    			// const sqlQueryUpdatePhoneNumbers = `UPDATE water_arlington.addresses SET owner_phone_1 = ?, SET df_first_name = ?, SET df_last_name = ?, SET df_address = ?, SET df_city = ?, SET df_state = ?, SET df_zip = ?

	    			const results = responses.map(row => {
	    				console.log("row", row.data.datafinder)
	    				const address = row.data.datafinder.results[0].Address;
	    				const phone = row.data.datafinder.results[0].Phone;
	    				const df_first_name = row.data.datafinder.results[0].FirstName;
	    				const df_middle_name = row.data.datafinder.results[0].MiddleName;
	    				const df_last_name = row.data.datafinder.results[0].LastName;
	    				const df_address = row.data.datafinder.results[0].Address;
	    				const df_city = row.data.datafinder.results[0].City;
	    				const df_state = row.data.datafinder.results[0].State;
	    				const df_zip = row.data.datafinder.results[0].Zip;
	    				let record = [phone, df_first_name, df_middle_name, df_last_name, df_address, df_city, df_state, df_zip, df_address];
	    				console.log('record', record);
	    				console.log('==============');
	    				return database.query(sqlQueryUpdatePhoneNumbers, record)
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
