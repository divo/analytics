// Based off https://www.pcmaffey.com/roll-your-own-analytics/
// listen for all the exit events
//window.addEventListener('pagehide', endSession)
//window.addEventListener('beforeunload', endSession)
//window.addEventListener('unload', endSession)
// for iOS when the focus leaves the tab
//if (iOS) window.addEventListener('blur', endSession)

const test = () => {
  console.log("Hello");
}

let skip;
// call this function on exit
const endSession = () => {
  debugger;
  // skip if the function has already been called
  if (skip) return
  skip = true

  // I also add an "end session" event to the data here
  const data = JSON.stringify({
        "sessionId": "9a6a2f6e-d924-47c6-9491-06ea88b3dd55",
        "userId": 1,
        "events": [
            {
                "eventName": "websiteEmbed",
                "timestamp": "2023-28-01T00:00:00.000Z"
            }
        ],
        "startedAt": "2023-27-01T00:00:00.000Z"
    })
  const url = null

  const { vendor } = window.navigator

  if (window.navigator.sendBeacon) {
    // try to send the beacon
    const beacon = window.navigator.sendBeacon(url, data)
    if (beacon) return
    // if it failed to queue, (some adblockers will block all beacons), then try the other way
  }

  // Instead, send an async request
  // Except for iOS :(
  //const async = !iOS
  //const request = new XMLHttpRequest()
  //request.open('POST', url, async) // 'false' makes the request synchronous
  //request.setRequestHeader('Content-Type', 'application/json')
  //request.send(data)

  // Synchronous request cause a slight delay in UX as the browser waits for the response
  // I've found it more performant to do an async call and use the following hack to keep the loop open while waiting

  // Chrome doesn't care about waiting
  //if (!async || ~vendor.indexOf('Google')) return

  // Latency calculated from navigator.performance
  const latency = data.latency || 0
  const t = Date.now() + Math.max(300, latency + 200)
  while (Date.now() < t) {
    // postpone the JS loop for 300ms so that the request can complete
    // a hack necessary for Firefox and Safari refresh / back button
  }
}
