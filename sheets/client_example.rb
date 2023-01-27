require "uri"
require "json"
require "net/http"

url = URI("Get from script deployment")

https = Net::HTTP.new(url.host, url.port)
https.use_ssl = true

request = Net::HTTP::Post.new(url)
request["Content-Type"] = "application/json"
request.body = JSON.dump({
  "sessionId": "9a6a2f6e-d924-47c6-9491-06ea88b3dd55",
  "startedAt": "1970-01-01T00:00:00.000Z",
  "events": [
    {
      "sessionId": 1241,
      "timestamp": "1970-01-01T00:00:00.000Z",
      "event": "docketCreated"
    }
  ]
})

response = https.request(request)
puts response.read_body

