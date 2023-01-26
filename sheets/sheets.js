// Script to accept data POSTed to a google sheet.
// Manually deployed
// original from: http://mashe.hawksey.info/2014/07/google-sheets-as-a-database-insert-with-apps-script-using-postget-methods-with-ajax-example/
// original gist: https://gist.github.com/willpatera/ee41ae374d3c9839c2d6 
// NOTE: Uses es5 javascript

// handle method: get
function doGet(e){
  return handleResponse(e);
}
// handles method: post
function doPost(e){
  return handleResponse(e);
}

//  Enter sheet names where data is to be written below
var SHEET_NAME1 = "Sessions";
var SHEET_NAME2 = "Events";
var SHEET_NAME3 = "Analytics";

// Session headers to aggregate to Analytics sheet
var SESSION_HEADERS = ["waitlist", "pageLoad", "latency", "pages", "length"]

// Estimate number of daily sessions (for performance)
var BATCH_SIZE = 50

// minimum time spent after page load to not register as a bounce
var BOUNCE_LENGTH = 3000

// Send errors to this email
var ERROR_EMAIL = "stevendiviney.aws.1@gmail.com"

// Send daily stats to this email
var STATS_EMAIL = 'stevendiviney.aws.1@gmail.com'

var SCRIPT_PROP = PropertiesService.getScriptProperties(); // new property service

function handleResponse(e) {
  // shortly after my original solution Google announced the LockService[1]
  // this prevents concurrent access overwritting data
  // [1] http://googleappsdeveloper.blogspot.co.uk/2011/10/concurrency-and-google-apps-script.html
  // we want a public lock, one that locks for all invocations
  var lock = LockService.getPublicLock();
  
  if (lock.tryLock(30000))  { // wait 30 seconds before conceding defeat.
    // I got the lock!  Wo000t!!!11 Do whatever I was going to do!
    try {
      // next set where we write the data
      var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
      var sessions = doc.getSheetByName(SHEET_NAME1);
      var events = doc.getSheetByName(SHEET_NAME2);
      var analytics = doc.getSheetByName(SHEET_NAME3);
      
      // merge params from post and get (es5)
      var params = JSON.parse((e.postData || {}).contents) || {}
      for (var param in e.parameter) { params[param] = e.parameter[param]; }
      
      // first, aggregate previous day sessions if not already
      if (analytics) dailyTotals(sessions, analytics)
      
      // add to session sheet
      addToSheet(sessions, [params])
      // add to events sheet
      if (params.Events && params.Events.length) addToSheet(events, params.Events)
      
      // return json success results
      return ContentService
      .createTextOutput(JSON.stringify({"result":"success" }))
      .setMimeType(ContentService.MimeType.JSON);
    } catch(e){
       GmailApp.sendEmail(ERROR_EMAIL, 'error: example.com analytics script', e);
      // if error return this
      return ContentService
      .createTextOutput(JSON.stringify({"result":"error", "error": e }))
      .setMimeType(ContentService.MimeType.JSON);
    } finally { //release lock
      lock.releaseLock();
    }
  } else {
    // I couldn’t get the lock, now for plan B :(
    GmailApp.sendEmail(ERROR_EMAIL, 'error:  example.com analytics script','lock acquisition fail!');
  }
}

// append data to sheet - rowsData is an array (rows) of objects (columns)
function addToSheet(sheet, rowsData) {
    // we'll assume header is in row 1
    var headers = getRow(sheet, 1);
    var nextRow = sheet.getLastRow()+1; // get next row
    var rows = rowsData.map(function(data) {
      var row = []; 
      // loop through the header columns
      for (i in headers){
        if (headers[i] === 'createdAt') {
          row.push(new Date())
        } else {
          // use header name to get data
          row.push(data[headers[i]]);
        }
      } 
      return row
    })
    
    // more efficient to set values as [][] array than individually
    sheet.getRange(nextRow, 1, rows.length, headers.length).setValues(rows);
}

// aggregates previous day's sessions (may not be yesterday) once per UTC day
// runs on every session, so tries to exit as quickly as possible for performance
// aggregating by createdAt date instead of startedAt, for simplicity
function dailyTotals(sessions, analytics) {
 
  // get the start of UTC day
  var today = new Date().setUTCHours(0, 0, 0, 0)
  
  // get last session
  var lastSessionRow = sessions.getLastRow()
  // if is first session exit
  if (lastSessionRow < 2) return
  // get the date of last session
  var date = sessions.getRange(lastSessionRow, 1, 1, 1).getValue()
  date.setUTCHours(0, 0, 0, 0)
  
  // exit if not first session of the day
  if (date.getTime() >= today) return
  
  // get the last day aggregated
  var lastRow = analytics.getLastRow()
  
   // if sheet is empty, lastRow will be 1
  if (lastRow !== 1) {
     var lastRowValues = analytics.getRange(lastRow, 1, 1, 2).getValues()[0];
    // use previous day to estimate batch size (min of 5)
    BATCH_SIZE = Math.max(lastRowValues[1], 5)
     
     var d = lastRowValues[0]
     var lastRowDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
     
      // exit if previous day has already been aggregated
     if (lastRowDate.getTime() >= date.getTime()) return
  }
  
  // now aggregate

  // get the index of the headers to aggregate for row array
  var headers = getRow(sessions, 1);
  var keys = {}
  for (i in SESSION_HEADERS){
    var key = SESSION_HEADERS[i]
    keys[key] = headers.indexOf(key)
  }
  
  
  // initialize totals for previous day
   var total = {
     date: (date.getUTCMonth() + 1) + '/' + date.getUTCDate() + '/' + date.getUTCFullYear(),
     sessions: 0,
     waitlist: 0,
     bounces: 0,
     // totals for calc
     pages: 0,
     pageLoad: 0,
     latency: 0,
     length: [] // used for median calc
  }
   
  function aggregate(session) {
    // exit if session is not from same day
    if (date.getTime() > new Date(session[0]).getTime()) return true
   
    // inc session data
    total.sessions += 1
    if (session[keys.waitlist]) total.waitlist += 1
    total.pages += (session[keys.pages] || 0)
    // a bounce is 1 pageview and time on page less than BOUNCE_LENGTH
    if (session[keys.pages] === 1 && session[keys.length] < BOUNCE_LENGTH) total.bounces += 1
    total.pageLoad += (session[keys.pageLoad] || 0)
    total.latency += (session[keys.latency] || 0)
    total.length.push(session[keys.length])
  }
  
  // faster to get a batch of rows at once instead of one at a time. Can only query by row number
  function getBatch(row, batch) {
    if (row < 2) return
    var from = row - batch + 1
    if (from < 2) from = 2
    var rows = sessions.getRange(from, 1, row - from + 1, sessions.getLastColumn()).getValues();
    for (i in rows) {
      var exit = aggregate(rows[rows.length - 1 - i])
      if (exit) break
    }
    // get the next batch
    if (!exit) getBatch(row - batch, batch)
  }
  
  // execute
  getBatch(lastSessionRow, BATCH_SIZE)
  
  // nothing to aggregate
  if (total.sessions < 1) return
  
  // calc averages
  total.avgPages = Math.round(total.pages / total.sessions * 100) / 100
  total.avgPageLoad = Math.round(total.pageLoad / total.sessions)
  total.avgLatency = Math.round(total.latency / total.sessions)
  total.length = total.length.sort( function(a,b) {return a - b;} );
  total.medianLength = total.length[Math.round(total.length.length / 2) - 1]
  
  
  addToSheet(analytics, [total])
  
  // send a summary
  var report = ''
  report += ' Date: ' + total.date 
  report += '\r\n Sessions: ' + total.sessions 
  report += '\r\n List signups: ' + total.list 
  report += '\r\n Bounces: ' + total.bounces 
  report += '\r\n Median Length: ' + total.medianLength 
  report += '\r\n Average Pages: ' + total.avgPages 
  report += '\r\n Average Page Load: ' + total.avgPageLoad
  report += '\r\n Average Latency: ' + total.avgLatency  
  
   GmailApp.sendEmail(STATS_EMAIL, 'daily analytics: example.com', report);
}

// returns array of values
function getRow(sheet, row) {
  return sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
}

// this must be run once manually
function setup() {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    SCRIPT_PROP.setProperty("key", doc.getId());
}
