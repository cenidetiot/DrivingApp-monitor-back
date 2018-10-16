var express = require("express");
var bodyParser 	= require('body-parser');
var morgan 		= require('morgan');
var cors 		= require('cors');
var fetch = require('node-fetch');

var crate = require('node-crate');
crate.connect('35.185.120.11', 4200);

var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
app.use(morgan('dev'));
app.use(cors());

var zonesAlerts = {};
var categoryAlerts = {};
var severityAlerts = {};

app.get("/", (req, res, next) => {
    res.json({
        message :  "API Admin Backend is Running",
        version : 1.0
    });
});

app.get("/alerts/count/category", (req, res) => {
    res.json(categoryAlerts); 
});

app.get("/alerts/count/severity", (req, res) => {
    res.json(severityAlerts);
});

app.get("/alerts/count/zone", (req, res) => {
    res.json(zonesAlerts);
});

app.get ("/choices/best", (req, res)=> {
    crate.execute("select alertsource, count(*) as total from etalert where alertsource like 'Device_Smartphone_%' group by alertsource order by total desc limit 10", [])
    .then((result) =>{
        res.json(result.json)
    })
}) 




function getSeverityAlerts(){
    crate.execute("select  etalert.severity, count(*) from etalert group by etalert.severity", [])
    .then((result) => {
        temp = {};
        result.rows.map(type =>{
            temp[type[0]] = type[1];
        });
        severityAlerts =  temp;
        io.emit('severityalerts', severityAlerts);
    })
}

function getCategoryAlerts (){
    crate.execute("select etalert.category, count(*) as total from etalert group by etalert.category", [])
    .then((result) => {
        temp = {};
        result.rows.map(type =>{
            temp[type[0]] = type[1];
        });
        categoryAlerts = temp;
        io.emit('categoryalerts', categoryAlerts);
    })
}

function getZoneAlerts() {
        fetch ("https://smartsecurity-webservice.herokuapp.com/api/zone?status=1")
        .then((response) => {return response.json()})
        .then((zones) => {
            zones.map((zone) => {
                let id = zone["idZone"]
                fetch(`https://smartsecurity-webservice.herokuapp.com/service/alerts/zone/history/${id}?id=Alert:Device_Smartphone_.*&location=false`)
                .then((result) =>{
                    zonesAlerts[id] = {
                        //count : result.headers.get("fiware-total-count"),
                        count : Math.random() * (10000 - 1) + 1,
                        name : zone["name"]
                    }
                    io.emit('zonealerts', zonesAlerts);
                })
            })
        })     
}

io.on('connection', function(socket){
    console.log('a user connected');
});

getZoneAlerts();
getCategoryAlerts();
getSeverityAlerts();
setInterval (()=> {
    getZoneAlerts();
    getCategoryAlerts();
    getSeverityAlerts();
}, 600000); 

const port = process.env.PORT || 3002;
http.listen(port, function(){
    console.log('listening on ' + port);
});
