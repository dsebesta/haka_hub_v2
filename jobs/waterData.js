
const axios = require("axios");
const schedule = require("node-schedule");
const url = "https://gis2.arlingtontx.gov/agsext2/rest/services/OpenData/OD_Table/MapServer/1/query?where=1%3D1&outFields=*&outSR=4326&f=json";
const refreshRate = 30;


console.log('waterData running...');


const getData = async url => {
	console.log('grabbing water data ' + getDateTime())
  try {
    const response = await axios.get(url);
    const data = response.data;
    data.features.map(res => console.log(res.attributes.PREMISEADDRESS + ", ARLINGTON, TX " + res.attributes.PREMISEZIP + " - WATER OFF DATE: " + res.attributes.WATEROFFDATE));
  } catch (error) {
    console.log(error);
  }
};

function getDateTime() {

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec;

};

var j = schedule.scheduleJob('*/1 * * * *', function(){
  console.log('pulling data...');
  getData(url);
});

