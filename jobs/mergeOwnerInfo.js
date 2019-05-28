const mysql = require('mysql');
const mysqlConfig  = require('../config/mysqlConfig.js');
const sqlQueryMissingOwnerNames = `SELECT street FROM water_arlington.addresses WHERE owner_name is null;`
const sqlQueryOwnerNames = `SELECT pd.Owner_Name as 'Owner', pd.Owner_Address as 'OwnerAddress', pd.Owner_CityState as 'OwnerCityState', pd.Situs_Address as 'PropertyAddress', 'ARLINGTON' as 'PropertyCity', 'TX' as 'PropertyState', arl.zip as 'PropertyZip', arl.water_shut_off as 'WaterShutOff' FROM water_arlington.addresses AS arl INNER JOIN water_arlington.propertydata2 AS pd ON arl.street=pd.Situs_Address WHERE pd.Situs_address IN ?;`
const sqlQueryUpdateAddresses = `UPDATE water_arlington.addresses SET owner_name = ?, owner_street_address = ?, owner_city = ?, owner_state = ? WHERE street = ?`

console.log('merging owner information...');

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
	database => database.query( sqlQueryMissingOwnerNames )
		.then( rows => {
			const reformatRows = rows.map(item => item.street)
			return reformatRows;
	    } )
	    .then( rows => {
	    	return database.query( sqlQueryOwnerNames, [[rows]] )
	    } )
	    .then( rows => {

			const updateDatabase = async () => {
	    		return await rows.map(row => {
	    			const owner_city = row.OwnerCityState.substr(0, row.OwnerCityState.length - 4);
	    			const owner_state = row.OwnerCityState.substr(-2);
	    			const owner_address = row.OwnerAddress.trim();
	    			console.log( row.PropertyAddress + ' updated successfully.' );
	    			const record = [row.Owner, owner_address, owner_city, owner_state, row.PropertyAddress];
	    			database.query( sqlQueryUpdateAddresses, record)
	    		})
	    	}

	    	return updateDatabase();

	    })
)
.then( (msg) => {
    console.log('success!')
} ).catch( err => {
    console.log('error 23: ', err)
} );
