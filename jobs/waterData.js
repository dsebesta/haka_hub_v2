
const axios = require("axios");
const schedule = require("node-schedule");
const url = "https://gis2.arlingtontx.gov/agsext2/rest/services/OpenData/OD_Table/MapServer/1/query?where=1%3D1&outFields=*&outSR=4326&f=json";
const refreshRate = 30;
const database  = require('../config/mysql_config.js');


console.log('waterData running...');


function getDateTime() {
    var date = new Date();
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;
    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;
    return year + "-" + month + "-" + day;
};


database.connect((err) => {
	if (err) throw err;
	console.log("connected to mysql!")
});


const getData = async url => {
	let date = getDateTime();
	console.log('grabbing water data ' + date)
  	try {
	  	// pull data from URL
	    const response = await axios.get(url);
	    const data = response.data;

    	// loop through data and print out addresses
    	data.features.map(
	    	res => {

	    		let streetAddress = res.attributes.PREMISEADDRESS;
	    		let zipCode = res.attributes.PREMISEZIP;
	    		let waterOffDate = res.attributes.WATEROFFDATE;
	    		let compareRecordSql = 'SELECT * FROM water_arlington.addresses WHERE street LIKE ?';

	    		database.query(compareRecordSql, streetAddress, (error1, results1, fields1) => {
			    	if (error1) {
			    		return console.error('error1:', error1.message);
			  		}
			  		if (results1.length == 0 ) {
						let insertRecordSql = 'INSERT INTO water_arlington.addresses (street, zip, water_shut_off, import_date) VALUES (?, ?, ?, ?)'
						let yearOff = waterOffDate.slice(-4);
						reformatWaterOffDate = yearOff + '/' + waterOffDate.slice(0, waterOffDate.length - 5);
						database.query(insertRecordSql, [streetAddress, zipCode, reformatWaterOffDate, date], (error2, results2, fields2) => {
							if (error2) {
			    				return console.error('error2:', error2.message);
			  				}
			  				else {
			  					console.log('inserted record: ', streetAddress);
			  				}
						})
			  		}
			  		else {
			  			console.log('record already exists');
			  		}
			  		
			    })    

	    	}
	    )

	    console.log('closing database');
		database.end();

    } 

    catch (error) {
    	console.log(error);
  	}


};

getData(url);






