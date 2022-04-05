//Part 1: Require
const fs = require('fs');
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const url = require("url");
const http = require('http');
const express = require("express");
const app = express();
const db = mongoose.connection;
app.use(bodyParser.urlencoded({
  extended: true
}));


//Part 2: DataBase
mongoose.connect('mongodb+srv://YairHarel:yair3241@customers.tsgqc.mongodb.net/Barbershop', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
db.on('error', () => console.log("Error in Connecting to Database"));
db.once('open', () => console.log("Connected to Database"));
const myCollaction = db.collection("CustomersData");


//Part 3: All variables declaration
let index = fs.readFileSync(`${__dirname}\\index.html`);
let cancel = fs.readFileSync(`${__dirname}\\cancel.html`);
let canceled = fs.readFileSync(`${__dirname}\\canceled.html`);
let saved = fs.readFileSync(`${__dirname}\\saved.html`);
let date_ob = new Date();
let day = ("0" + date_ob.getDate()).slice(-2);
let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
let year = date_ob.getFullYear();
let date = day + "-" + month + "-" + year;
let data = {
  all: [],
  today: [],
  available: [],
  forCancel: [],
  cancel: ['הכנס את מספר הטלפון של בעל התור', 'על מנת לבטל את התור', ''],
  saved: [''],
  phone: '',
  secondPhone: ''
};


//Function that fiils all available appointments for specific date
const fillAppointments = (date) => {
  data.today = [];
  for (let i = 0, j = 0; i < data.all.length; i++) {
    if (data.all[i].date === date) {
      data.today[j++] = data.all[i];
    }
  }
  data.today = data.today.sort();
  data.all = data.all.sort();
  let j = 0;
  for (let i = 0, time = 900; time < 1915; time += 15, i++) {

    let check;
    if ((time % 100) >= 60) {
      time += 100;
      time -= 75;
      continue;
    }
    if (time < 1000)
      check = "0" + Math.floor(time / 100) + ":" + time % 100;
    else
      check = "" + Math.floor(time / 100) + ":" + time % 100;
    if (check.length == 4)
      check += "0";
    let flag = false;
    for (let k = 0; k < data.today.length && !flag; k++) {
      if (data.today[k].time === check) {
        flag = true;
      }
    }
    if (!flag)
      data.available[j++] = check;
  }
  data.available = data.available.sort();
};


//handling all GET requests
app.get("*", (req, res) => {
  const { pathname, query } = url.parse(req.url, true);
  myCollaction.find().toArray((err, result) => {
    if (err) throw err;
    data.all = result;
  });
  if (pathname === '/' || pathname === '/HomePage' || pathname === '/server.js')
    res.end(index);
  else if (pathname.includes('/Turns') || pathname === pathname.includes('/Appointments')) {
    fillAppointments(query.date);
    res.send(JSON.stringify(data));
  }
  else if (pathname === '/save/data') {
    res.send(JSON.stringify(data.saved));
  }
  else if (pathname === '/cancel/data') {
    res.send(JSON.stringify(data.forCancel));
  }
  else {
    res.end('<h1 style="text-align: left; margin:50px;font-size: 100px; font-weight: 900;">404</h1><h2 style="text-align: left; margin:20px;font-size: 50px; font-weight: 900;">Page not found</h2>');
  }
}).listen(3000);


//handling all POST requests
app.post("*", (req, res) => {
  const { pathname, query } = url.parse(req.url, true);
  if (pathname === '/save') {
    var date = req.body.date;
    var time = req.body.time;
    var name = req.body.name;
    var phone = req.body.phone;
    var turnData = {
      "date": date,
      "time": time,
      "name": name,
      "phone": phone
    };
    data.saved = [`${name}, התור שלך נשמר`,
    `  ל ${date} בשעה ${time}`];
    myCollaction.insertOne(turnData, (err, collection) => {
      if (err)
        throw err;
    });
    res.end(saved);
  }
  else if (pathname === '/cancel') {
    data.phone = req.body.phoneCancel;
    if (data.phone.length == 10) {
      data.secondPhone = data.phone.substring(0, 3);
      data.secondPhone += '-';
      data.secondPhone += data.phone.substring(3, 6);
      data.secondPhone += '-';
      data.secondPhone += data.phone.substring(6);
    }
    else if (data.phone.length == 12) {
      data.secondPhone = data.phone.substring(0, 3);
      data.secondPhone += data.phone.substring(4, 7);
      data.secondPhone += data.phone.substring(8);
    }
    for (let i = 0, j = 0; i < data.all.length; i++) {
      if (data.all[i].phone === data.phone || data.all[i].phone === data.secondPhone) {
        data.forCancel[j++] = data.all[i];
      }
    }
    console.log("in Cancel", data.phone, data.secondPhone);
    res.end(cancel);
  }
  else if (pathname === '/canceled') {
    console.log("in Canceled", data.phone, data.secondPhone);
    let appointment = req.body.appointment;
    if (appointment === 'first' || appointment === 'none') {
      return;
    }
    else if (appointment === "all") {
      myCollaction.deleteMany({ $or: [{ "phone": data.phone }, { "phone": data.secondPhone }] }, (err, collection) => {
        if (err) {
          throw err;
        }
        console.log("Custumer removed Successfully", collection);
      });
    }
    else {
      let time = appointment.substring(0, 5);
      appointment = appointment.substring(6);
      myCollaction.deleteOne({ "time": time, "date": appointment }, (err, collection) => {
        if (err) {
          throw err;
        }
        console.log("Custumer removed Successfully", collection);
      });
    }
    myCollaction.find().toArray((err, result) => {
      if (err) throw err;
      data.all = result;
      fillAppointments(date);
    });
    res.end(canceled);
  }
});