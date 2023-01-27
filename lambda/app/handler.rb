require 'json'
require 'securerandom'
require "uri"
require "net/http"


SHEETS_URL = ENV["SHEETS_URL"]

def handler(event:, context:)
  data = JSON.parse(event['body'].to_json, object_class: OpenStruct)


  raise "Invalid data" if(!data || !data.events)

  # TODO: Sort the events, probably need to parse timestamps
  data.events.sort_by! { |e| e.timestamp }

  # Value to save in sheets
  session_data = {
    sessionId: SecureRandom.uuid,
    startedAt: data.events[0].timestamp,
    userId: data.userId
  }

  # Events
  session_data[:events] = data.events.map do |event|
    {
      sessionId: session_data[:sessionId],
      timestamp: event.timestamp,
      event: event.eventName
    }
  end

  # Post to Google Sheets
  begin
    url = URI(SHEETS_URL)

    https = Net::HTTP.new(url.host, url.port)
    https.use_ssl = true

    request = Net::HTTP::Post.new(url)
    request["Content-Type"] = "application/json"
    request.body = session_data.to_json
    response = https.request(request)

    return {
      "statusCode": 200,
      "body": response.read_body
    }
  rescue => e
    puts e.message
    return {
      statusCode: 500,
      body: { msg: e.message }.to_json
    }

  end
end
